"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { ArrowLeft, Star, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import {
  ChatConversation,
  ChatMessage,
  fetchAllConversations,
  fetchConversationMessages,
  sendChatMessage,
  submitBusinessReview,
} from "@/lib/businesses";
import {
  SellerSaleRecord,
  logSale,
  confirmSaleAsBuyer,
  getConversationSales,
} from "@/lib/sales";
import { UserRole, getInitials } from "@/components/auth/validators";
import {
  buildDemoProducerReply,
  isDemoBusinessId,
} from "@/lib/demoBusinesses";

interface LiveChatViewProps {
  userName: string;
  userAvatar?: string;
  userId?: string;
  userRole?: UserRole;
  activeConversation: ChatConversation | null;
  onSelectConversation: (conv: ChatConversation | null) => void;
  onSaleMetricsChanged?: (
    businessId: string,
    completedDelta: number,
    verifiedDelta: number
  ) => void;
  onReviewSubmitted?: (businessId: string, newRating: number) => void;
}

export function LiveChatView({
  userName,
  userId,
  userRole = "both",
  activeConversation,
  onSelectConversation,
  onSaleMetricsChanged,
  onReviewSubmitted,
}: LiveChatViewProps) {
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const [conversationSales, setConversationSales] = useState<
    SellerSaleRecord[]
  >([]);
  const [showQuickSalePanel, setShowQuickSalePanel] = useState(false);
  const [quickItemSummary, setQuickItemSummary] = useState("");
  const [quickQuantity, setQuickQuantity] = useState("1");
  const [quickAmountMxn, setQuickAmountMxn] = useState("");
  const [loggingSale, setLoggingSale] = useState(false);
  const [confirmingSaleId, setConfirmingSaleId] = useState<string | null>(null);
  const [ratedSaleIds, setRatedSaleIds] = useState<string[]>([]);

  const canMarkSale =
    userRole === "seller" ||
    userRole === "both" ||
    Boolean(userId && activeConversation?.sellerId === userId);

  useEffect(() => {
    fetchAllConversations().then((list) => {
      if (
        activeConversation &&
        !list.some((c) => c.id === activeConversation.id)
      ) {
        setConversations([activeConversation, ...list]);
      } else {
        setConversations(list);
      }
    });
  }, [activeConversation]);

  const loadSalesForActiveChat = useCallback(async () => {
    if (!activeConversation) return;
    const list = await getConversationSales(
      activeConversation.id,
      activeConversation.businessId
    );
    setConversationSales(list);
  }, [activeConversation]);

  useEffect(() => {
    if (!activeConversation) return;

    let mounted = true;
    setQuickItemSummary(activeConversation.businessName || "");
    void loadSalesForActiveChat();

    fetchConversationMessages(activeConversation.id).then((initial) => {
      if (!mounted) return;
      if (initial.length === 0) {
        setMessages([
          {
            id: "welcome-msg",
            conversationId: activeConversation.id,
            senderName: activeConversation.producerName,
            isFromSeller: true,
            body: `¡Hola! Soy ${activeConversation.producerName}. ¿En qué te puedo ayudar hoy respecto a "${activeConversation.businessName}"?`,
            createdAt: new Date().toISOString(),
          },
        ]);
      } else {
        setMessages(initial);
      }
    });

    const channel = supabase
      .channel(`chat-${activeConversation.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${activeConversation.id}`,
        },
        (payload) => {
          const row = payload.new as Record<string, unknown>;
          if (!row?.id) return;
          const incoming: ChatMessage = {
            id: String(row.id),
            conversationId: String(row.conversation_id),
            senderName: String(row.sender_name || "Vecino"),
            isFromSeller: Boolean(row.is_from_seller),
            body: String(row.body || ""),
            createdAt: String(row.created_at || new Date().toISOString()),
          };
          setMessages((prev) =>
            prev.some((m) => m.id === incoming.id) ? prev : [...prev, incoming]
          );
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "sales",
        },
        () => {
          void loadSalesForActiveChat();
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      void supabase.removeChannel(channel);
    };
  }, [activeConversation, loadSalesForActiveChat]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeConversation || !draft.trim() || sending) return;

    const text = draft.trim();
    setDraft("");
    setSending(true);

    const sent = await sendChatMessage({
      conversationId: activeConversation.id,
      senderName: userName || "Vecino",
      body: text,
      isFromSeller: false,
    });

    setMessages((prev) =>
      prev.some((m) => m.id === sent.id) ? prev : [...prev, sent]
    );
    setSending(false);

    // Respuesta automática en negocios de prueba para validar el chat en vivo
    if (isDemoBusinessId(activeConversation.businessId)) {
      const targetConv = activeConversation;
      window.setTimeout(async () => {
        const replyBody = buildDemoProducerReply(
          targetConv.businessName,
          targetConv.producerName,
          text
        );
        const replyMsg = await sendChatMessage({
          conversationId: targetConv.id,
          senderName: targetConv.producerName,
          body: replyBody,
          isFromSeller: true,
        });
        setMessages((prev) =>
          prev.some((m) => m.id === replyMsg.id) ? prev : [...prev, replyMsg]
        );
      }, 1100);
    }
  };

  const handleQuickMarkSale = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeConversation || loggingSale) return;
    const summaryText =
      quickItemSummary.trim() || activeConversation.businessName;
    if (!summaryText) return;

    setLoggingSale(true);
    const bizId =
      activeConversation.businessId || "22222222-2222-4222-8222-222222222201";
    const qty = Math.max(1, Number(quickQuantity) || 1);
    const amount =
      quickAmountMxn.trim() !== "" ? Number(quickAmountMxn) : null;

    const res = await logSale({
      businessId: bizId,
      businessName: activeConversation.businessName,
      itemSummary: summaryText,
      quantity: qty,
      amountMxn: amount,
      buyerId: activeConversation.buyerId ?? null,
      conversationId: activeConversation.id,
    });

    if (res.ok && res.sale) {
      setConversationSales((prev) => [res.sale!, ...prev]);
      onSaleMetricsChanged?.(bizId, 1, 0);

      const autoMsg = await sendChatMessage({
        conversationId: activeConversation.id,
        senderName: activeConversation.producerName || userName,
        body: `Entrega registrada: ${summaryText}${qty > 1 ? ` (×${qty})` : ""}.`,
        isFromSeller: true,
      });

      setMessages((prev) =>
        prev.some((m) => m.id === autoMsg.id) ? prev : [...prev, autoMsg]
      );
    }

    setLoggingSale(false);
    setQuickAmountMxn("");
    setShowQuickSalePanel(false);
  };

  const handleConfirmDelivery = async (sale: SellerSaleRecord) => {
    if (confirmingSaleId) return;
    setConfirmingSaleId(sale.id);

    await confirmSaleAsBuyer(sale.id);
    setConversationSales((prev) =>
      prev.map((s) =>
        s.id === sale.id
          ? {
              ...s,
              buyerConfirmed: true,
              buyerConfirmedAt: new Date().toISOString(),
            }
          : s
      )
    );
    onSaleMetricsChanged?.(sale.businessId, 0, 1);

    if (activeConversation) {
      const confirmMsg = await sendChatMessage({
        conversationId: activeConversation.id,
        senderName: userName || "Vecino",
        body: `Confirmé la entrega de "${sale.itemSummary}".`,
        isFromSeller: false,
      });
      setMessages((prev) =>
        prev.some((m) => m.id === confirmMsg.id) ? prev : [...prev, confirmMsg]
      );
    }

    setConfirmingSaleId(null);
  };

  const handleQuickStarRate = async (sale: SellerSaleRecord, stars: number) => {
    if (ratedSaleIds.includes(sale.id)) return;
    setRatedSaleIds((prev) => [...prev, sale.id]);
    await submitBusinessReview({
      businessId: sale.businessId,
      reviewerName: userName || "Vecino",
      rating: stars,
      comment: `Entrega confirmada: ${sale.itemSummary}`,
    });
    onReviewSubmitted?.(sale.businessId, stars);
  };

  if (!activeConversation) {
    return (
      <div className="space-y-3 pb-8">
        <h2 className="text-lg font-semibold tracking-tight text-[#13150C]">
          Chats
        </h2>

        {conversations.length === 0 ? (
          <div className="rounded-xl bg-[#FFFFFF] p-6 text-center text-sm text-[#6E6D5F] shadow-[0_2px_10px_rgba(19,21,12,0.04)]">
            Sin conversaciones activas
          </div>
        ) : (
          <div className="space-y-2">
            {conversations.map((conv) => (
              <button
                key={conv.id}
                type="button"
                onClick={() => onSelectConversation(conv)}
                className="flex w-full items-center gap-3 rounded-xl bg-[#FFFFFF] p-3.5 text-left shadow-[0_2px_10px_rgba(19,21,12,0.04)] transition-colors hover:bg-[#EFEFEA]/60"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#2B4628] text-xs font-semibold text-[#F7F7F4]">
                  {getInitials(conv.producerName)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-medium text-[#13150C]">
                    {conv.producerName}
                  </p>
                  <p className="truncate text-xs font-medium text-[#2B4628]">
                    {conv.businessName}
                  </p>
                  {conv.lastMessage && (
                    <p className="mt-0.5 truncate text-xs text-[#6E6D5F]">
                      {conv.lastMessage}
                    </p>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  const latestSale = conversationSales[0] ?? null;

  return (
    <div className="flex h-[calc(100dvh-230px)] min-h-[380px] max-h-[620px] flex-col overflow-hidden rounded-xl bg-[#FFFFFF] shadow-[0_2px_10px_rgba(19,21,12,0.04)]">
      {/* Chat Header */}
      <div className="flex items-center gap-2 bg-[#EFEFEA] px-3.5 py-2.5">
        <button
          type="button"
          onClick={() => onSelectConversation(null)}
          aria-label="Volver"
          className="bg-transparent p-1.5 text-[#13150C]/70 transition-colors hover:text-[#13150C]"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={1.6} />
        </button>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-[#13150C]">
            {activeConversation.producerName}
          </p>
          <p className="truncate text-xs text-[#6E6D5F]">
            {activeConversation.businessName}
          </p>
        </div>

        {canMarkSale && (
          <button
            type="button"
            onClick={() => setShowQuickSalePanel((prev) => !prev)}
            className={[
              "h-8 shrink-0 rounded-lg px-3 text-xs font-semibold transition-colors",
              showQuickSalePanel
                ? "bg-[#2B4628] text-[#F7F7F4]"
                : "bg-[#FFFFFF] text-[#2B4628] hover:bg-[#2B4628] hover:text-[#F7F7F4]",
            ].join(" ")}
          >
            Marcar venta
          </button>
        )}
      </div>

      {/* Quick Seller Sale Mini-Panel */}
      {showQuickSalePanel && (
        <form
          onSubmit={handleQuickMarkSale}
          className="space-y-2 bg-[#F7F7F4] px-3.5 py-2.5 shadow-[0_2px_10px_rgba(19,21,12,0.04)]"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#13150C]">
              Registrar venta
            </span>
            <button
              type="button"
              onClick={() => setShowQuickSalePanel(false)}
              aria-label="Cerrar panel de venta"
              className="bg-transparent p-1.5 text-[#13150C]/55 transition-colors hover:text-[#13150C]"
            >
              <X className="h-4 w-4" strokeWidth={1.6} />
            </button>
          </div>

          <input
            type="text"
            placeholder="Producto"
            value={quickItemSummary}
            onChange={(e) => setQuickItemSummary(e.target.value)}
            className="h-9 w-full rounded-lg bg-[#FFFFFF] px-3 text-sm text-[#13150C] placeholder:text-[#6E6D5F] outline-none"
          />

          <div className="grid grid-cols-2 gap-2">
            <input
              type="number"
              min={1}
              placeholder="Cantidad"
              value={quickQuantity}
              onChange={(e) => setQuickQuantity(e.target.value)}
              className="h-9 w-full rounded-lg bg-[#FFFFFF] px-3 text-sm text-[#13150C] outline-none"
            />
            <input
              type="number"
              min={0}
              step="0.01"
              placeholder="Monto (opcional)"
              value={quickAmountMxn}
              onChange={(e) => setQuickAmountMxn(e.target.value)}
              className="h-9 w-full rounded-lg bg-[#FFFFFF] px-3 text-sm text-[#13150C] placeholder:text-[#6E6D5F] outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={loggingSale}
            className="flex h-9 w-full items-center justify-center rounded-lg bg-[#2B4628] px-4 text-xs font-semibold text-[#F7F7F4] transition-colors hover:bg-[#223820]"
          >
            {loggingSale ? "Guardando…" : "Guardar"}
          </button>
        </form>
      )}

      {/* Buyer Delivery Confirmation Banner + 1-Tap Star Rating */}
      {latestSale && (
        <div className="bg-[#F7F7F4] px-3.5 py-2">
          {!latestSale.buyerConfirmed ? (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-[#FFFFFF] p-3 shadow-[0_2px_10px_rgba(19,21,12,0.04)]">
              <p className="min-w-0 flex-1 text-xs font-medium text-[#13150C]">
                {activeConversation.producerName} marcó la entrega de{" "}
                <span className="font-semibold text-[#2B4628]">
                  {latestSale.itemSummary}
                </span>
              </p>
              <button
                type="button"
                disabled={confirmingSaleId === latestSale.id}
                onClick={() => handleConfirmDelivery(latestSale)}
                className="h-8 shrink-0 rounded-lg bg-[#1F3A26] px-3 text-xs font-medium text-[#F4F7F4]"
              >
                {confirmingSaleId === latestSale.id
                  ? "Confirmando…"
                  : "Confirmar entrega"}
              </button>
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-[#FFFFFF] px-3 py-2 shadow-[0_2px_10px_rgba(19,21,12,0.04)]">
              <span className="rounded-md bg-[#1F3A26] px-2 py-0.5 text-xs font-medium text-[#F4F7F4]">
                Confirmada
              </span>

              {!ratedSaleIds.includes(latestSale.id) ? (
                <div className="flex items-center gap-0.5">
                  <span className="mr-1 text-xs text-[#6E6D5F]">
                    Calificar:
                  </span>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => handleQuickStarRate(latestSale, star)}
                      aria-label={`Calificar con ${star} estrellas`}
                      className="bg-transparent p-1 text-[#C88A1E] transition-transform hover:scale-110"
                    >
                      <Star
                        className="h-4 w-4 fill-[#C88A1E]"
                        strokeWidth={1.6}
                      />
                    </button>
                  ))}
                </div>
              ) : (
                <span className="text-xs font-medium text-[#2B4628]">
                  Calificado
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Messages Stream */}
      <div className="nafe-scroll flex-1 space-y-2 overflow-y-auto p-3.5">
        {messages.map((msg) => {
          const isMine = !msg.isFromSeller;
          return (
            <div
              key={msg.id}
              className={`flex flex-col ${
                isMine ? "items-end" : "items-start"
              }`}
            >
              <div
                className={[
                  "max-w-[82%] rounded-xl px-3 py-2 text-sm leading-snug",
                  isMine
                    ? "bg-[#2B4628] text-[#F7F7F4]"
                    : "bg-[#EFEFEA] text-[#13150C]",
                ].join(" ")}
              >
                <p>{msg.body}</p>
              </div>
              <span className="mt-0.5 px-1 text-xs text-[#6E6D5F]">
                {msg.senderName}
              </span>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input Bar */}
      <form
        onSubmit={handleSend}
        className="flex items-center gap-2 bg-[#F7F7F4] p-2.5"
      >
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Mensaje"
          className="h-10 min-w-0 flex-1 rounded-lg bg-[#EFEFEA] px-3 text-[16px] text-[#13150C] placeholder:text-[#6E6D5F] outline-none focus:bg-[#FFFFFF] sm:text-sm"
        />
        <button
          type="submit"
          disabled={!draft.trim() || sending}
          className="h-10 shrink-0 rounded-lg bg-[#2B4628] px-3.5 text-sm font-medium text-[#F7F7F4] transition-colors hover:bg-[#223820] disabled:opacity-50"
        >
          Enviar
        </button>
      </form>
    </div>
  );
}
