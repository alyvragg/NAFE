-- =============================================================================
-- NAFE — SEED DATA REALISTA CON COORDENADAS APROXIMADAS Y FOTOS (7 SECCIONES)
-- =============================================================================

insert into public.producers (
  id,
  title,
  producer_name,
  category,
  description,
  public_meeting_point,
  schedule_today,
  savings_tag,
  approx_lat,
  approx_lng,
  status,
  photos,
  whatsapp
)
values
-- 1. COMIDA Y GASTRONOMÍA
(
  '11111111-1111-4111-8111-111111111101',
  'Queso fresco de rancho y requesón del día',
  'Familia Morales · Rancho San Isidro',
  'comida',
  'Ordeña limpia cada madrugada en el Valle del Guadiana. Cuajado artesanal en aro de madera sin conservadores ni féculas, entregado fresco en hielera sellada.',
  'Zona Mercado Gómez Palacio / Kiosco Central',
  'Hoy de 08:30 a 18:00 hrs',
  'Directo · Ahorras ~25%',
  24.0262,
  -104.6685,
  'confirmed_today',
  ARRAY[
    'https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?auto=format&fit=crop&w=900&q=80',
    'https://images.unsplash.com/photo-1452195100486-9cc805987862?auto=format&fit=crop&w=900&q=80'
  ],
  '526181428910'
),
(
  '11111111-1111-4111-8111-111111111102',
  'Pan de agua en horno de leña y miel de mezquite',
  'Horno Tradicional · Doña Carmen',
  'comida',
  'Masa madre fermentada lentamente y horneada en adobe con leña de encino recuperada, acompañada de frascos de miel cruda de mezquite sin filtrar.',
  'Crucero Plazuela Baca Ortiz',
  'Hoy de 08:00 a 17:30 hrs',
  'Recién horneado · Ahorras ~20%',
  24.0289,
  -104.6741,
  'confirmed_today',
  ARRAY[
    'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=900&q=80',
    'https://images.unsplash.com/photo-1587049352847-4a222e784d38?auto=format&fit=crop&w=900&q=80'
  ],
  '526181983341'
),
(
  '11111111-1111-4111-8111-111111111103',
  'Tortillas de maíz criollo azul y conservas caseras',
  'Molino San Juan · Colectivo Milpa',
  'comida',
  'Nixtamal tradicional con cal de piedra y maíz criollo cultivado sin agroquímicos por familias campesinas de la sierra duranguense.',
  'Tienda Embajadora Barrio de Analco',
  'Hoy de 09:00 a 16:30 hrs',
  'Maíz nativo · Ahorras ~22%',
  24.0195,
  -104.6698,
  'confirmed_today',
  ARRAY[
    'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?auto=format&fit=crop&w=900&q=80'
  ],
  '526183107724'
),

-- 2. PLANTAS Y VIVEROS
(
  '11111111-1111-4111-8111-111111111104',
  'Árboles frutales injertados, pino local y suculentas',
  'Vivero Sierra Madre · Don Rogelio',
  'plantas',
  'Plantas de ornato, suculentas, manzanos, duraznos y árboles nativos adaptados al clima y suelo de la región, criados con composta orgánica.',
  'Explanada Parque Guadiana / Acceso Norte',
  'Hoy de 09:30 a 19:00 hrs',
  'Cultivo aclimatado · Ahorras ~30%',
  24.0221,
  -104.6872,
  'confirmed_today',
  ARRAY[
    'https://images.unsplash.com/photo-1466692476868-aef1dfb1e735?auto=format&fit=crop&w=900&q=80',
    'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?auto=format&fit=crop&w=900&q=80'
  ],
  '526182451120'
),
(
  '11111111-1111-4111-8111-111111111105',
  'Herbolaria medicinal, lavanda, romero y semillas criollas',
  'Huerto Vivo · Colectivo Botánico',
  'plantas',
  'Macetas aromáticas de cocina, plantas medicinales y sobres de semilla criolla lista para huertos urbanos y traspatio.',
  'Kiosco Jardín de San Antonio',
  'Entregas hoy de 11:00 a 18:00 hrs',
  'Semilla libre de químicos',
  24.0315,
  -104.6612,
  'on_demand',
  ARRAY[
    'https://images.unsplash.com/photo-1523348837708-15d4a09cfac2?auto=format&fit=crop&w=900&q=80'
  ],
  '526183901188'
),

-- 3. MINERÍA Y CANTERA
(
  '11111111-1111-4111-8111-111111111106',
  'Cantera rosa y gris labrada a mano · Laja y adoquín',
  'Canteros Unidos · Maestro Aurelio',
  'mineria',
  'Extracción y labrado artesanal de cantera: fuentes, columnas, pisos de laja natural, molcajetes de piedra volcánica y recubrimientos.',
  'Crucero Salida a Mezquital / Parador Público',
  'Muestras y pedidos hoy de 08:00 a 18:30 hrs',
  'Precio de banco · Ahorras ~35%',
  24.0064,
  -104.6425,
  'confirmed_today',
  ARRAY[
    'https://images.unsplash.com/photo-1578662996442-48f60103fc96?auto=format&fit=crop&w=900&q=80',
    'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=900&q=80'
  ],
  '526185104432'
),
(
  '11111111-1111-4111-8111-111111111107',
  'Piedra de río seleccionada, grava decorativa y cuarzos locales',
  'Cooperativa Pétrea del Guadiana',
  'mineria',
  'Materiales pétreos naturales para jardín, construcción tradicional y muestras minerales de hierro y cuarzo recolectadas legalmente.',
  'Plazoleta Estación Antigua Ferrocarril',
  'Hoy de 09:00 a 17:00 hrs',
  'Trato directo sin flete revendido',
  24.0398,
  -104.6661,
  'on_demand',
  ARRAY[
    'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=900&q=80'
  ],
  '526186219087'
),

-- 4. CAMPO Y HUERTA
(
  '11111111-1111-4111-8111-111111111108',
  'Canasta de hortalizas de estación y huevo de libre pastoreo',
  'Huerta Los Sauces · Familia Saucedo',
  'campo',
  'Cosechamos acelga, rábano, calabacita, cilantro criollo y recolectamos huevo de rancho una hora antes de vernos en el punto público.',
  'Glorieta Jardín Vizcaya',
  'Entregas hoy 12:30 y 17:30 hrs',
  'Cero intermediarios · Ahorras ~28%',
  24.0342,
  -104.6491,
  'confirmed_today',
  ARRAY[
    'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=900&q=80',
    'https://images.unsplash.com/photo-1598965402089-897ce52e8355?auto=format&fit=crop&w=900&q=80'
  ],
  '526184059182'
),
(
  '11111111-1111-4111-8111-111111111109',
  'Manzana criolla de Canatlán, nuez y frijol pinto nuevo',
  'Productores del Valle · Don Hilario',
  'campo',
  'Fruta recién traída de las huertas familiares de Canatlán y frijol pinto de temporal limpio, cribado a mano y sin intermediarios.',
  'Explanada Mercado El Refugio',
  'Hoy de 08:30 a 18:00 hrs',
  'Cosecha limpia · Ahorras ~30%',
  24.0241,
  -104.6579,
  'confirmed_today',
  ARRAY[
    'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?auto=format&fit=crop&w=900&q=80'
  ],
  '526187442310'
),

-- 5. ARTESANÍA Y TALLERES
(
  '11111111-1111-4111-8111-111111111110',
  'Cazuelas y jarros de barro bruñido libres de plomo',
  'Taller Sierra · Maestro Mateo',
  'artesania',
  'Barro recolectado localmente, moldeado a mano y horneado a baja temperatura con esmaltes minerales 100% libres de plomo.',
  'Corredor Cultural Constitución',
  'Hoy de 11:00 a 20:00 hrs',
  'Trato justo directo al artesano',
  24.0273,
  -104.6712,
  'confirmed_today',
  ARRAY[
    'https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?auto=format&fit=crop&w=900&q=80',
    'https://images.unsplash.com/photo-1610701596007-11502861dcfa?auto=format&fit=crop&w=900&q=80'
  ],
  '526185126093'
),
(
  '11111111-1111-4111-8111-111111111111',
  'Bateas de madera de pino y talabartería tradicional',
  'Taller El Mezquite · Familia Reyes',
  'artesania',
  'Utensilios de cocina tallados en madera certificada de la sierra duranguense y artículos de cuero curtido vegetalmente.',
  'Plaza IV Centenario / Portal Sur',
  'Hoy de 10:30 a 19:00 hrs',
  'Hecho a mano · Sin revendedores',
  24.0255,
  -104.6725,
  'on_demand',
  ARRAY[
    'https://images.unsplash.com/photo-1610701596061-2ecf227e85b2?auto=format&fit=crop&w=900&q=80'
  ],
  '526188321944'
),

-- 6. TEXTILES Y MODA LOCAL
(
  '11111111-1111-4111-8111-111111111112',
  'Bolsos, blusas y caminos de mesa con bordado tradicional',
  'Colectivo Textil O''dam · Maestra Elena',
  'textiles',
  'Piezas únicas tejidas y bordadas en punto de cruz por mujeres artesanas del Mezquital, utilizando algodón natural e hilos de alta durabilidad.',
  'Plaza de Armas / Kiosco Central',
  'Hoy de 10:00 a 19:00 hrs',
  '100% para la artesana',
  24.0247,
  -104.6702,
  'confirmed_today',
  ARRAY[
    'https://images.unsplash.com/photo-1606760227091-3dd870d97f1d?auto=format&fit=crop&w=900&q=80'
  ],
  '526189045512'
),
(
  '11111111-1111-4111-8111-111111111113',
  'Gabanes, cobijas y prendas de lana en telar de pedal',
  'Telares del Valle · Don Sebastián',
  'textiles',
  'Tejidos abrigadores elaborados en telar de madera con lana lavada y teñida con tintes naturales de nogal, grana y cempasúchil.',
  'Plazuela del Calvario',
  'Hoy de 11:00 a 18:30 hrs',
  'Lana pura · Ahorras ~25%',
  24.0278,
  -104.6778,
  'on_demand',
  ARRAY[
    'https://images.unsplash.com/photo-1584992236310-6edddc08a327?auto=format&fit=crop&w=900&q=80'
  ],
  '526183347890'
),

-- 7. SERVICIOS Y OFICIOS
(
  '11111111-1111-4111-8111-111111111114',
  'Carpintería de barrio, afilado y restauración de muebles',
  'Oficios San José · Maestro Luis',
  'servicios',
  'Reparación de sillas, puertas, mesas de madera maciza y afilado profesional de herramientas de cocina y jardín en el mismo día.',
  'Punto Público Barrio de Tierra Blanca',
  'Atención hoy de 08:30 a 18:30 hrs',
  'Presupuesto directo y honesto',
  24.0168,
  -104.6645,
  'confirmed_today',
  ARRAY[
    'https://images.unsplash.com/photo-1504148455328-c376907d081c?auto=format&fit=crop&w=900&q=80'
  ],
  '526184438291'
),
(
  '11111111-1111-4111-8111-111111111115',
  'Herrería artística, soldadura móvil y arreglo de bicicletas',
  'Taller Forja Viva · Ing. Marcos',
  'servicios',
  'Fabricación de maceteros en hierro forjado, ajustes de herrería doméstica y mantenimiento mecánico de bicicletas de trabajo.',
  'Explanada Deportiva / Entrada Principal',
  'Hoy de 09:00 a 19:00 hrs',
  'Servicio local garantizado',
  24.0361,
  -104.6548,
  'confirmed_today',
  ARRAY[
    'https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?auto=format&fit=crop&w=900&q=80'
  ],
  '526187712349'
)
on conflict (id) do update
  set title = excluded.title,
      producer_name = excluded.producer_name,
      category = excluded.category,
      description = excluded.description,
      public_meeting_point = excluded.public_meeting_point,
      schedule_today = excluded.schedule_today,
      savings_tag = excluded.savings_tag,
      approx_lat = excluded.approx_lat,
      approx_lng = excluded.approx_lng,
      status = excluded.status,
      photos = excluded.photos,
      whatsapp = excluded.whatsapp;
