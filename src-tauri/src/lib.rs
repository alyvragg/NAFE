use serde::{Deserialize, Serialize};
use std::cmp::Ordering;
use std::fs;
use tauri::Manager;
use tauri_plugin_notification::NotificationExt;

const EARTH_RADIUS_KM: f64 = 6371.0;
const OFFLINE_CACHE_FILE: &str = "nafe_offline_cache.json";

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BusinessGeoItem {
    pub id: String,
    pub approx_lat: f64,
    pub approx_lng: f64,
    #[serde(default)]
    pub distance_km: f64,
    #[serde(flatten)]
    pub extra: serde_json::Map<String, serde_json::Value>,
}

/// Fórmula exacta de Haversine en Rust puro (distancia en km redondeada a 1 decimal).
pub fn haversine_km(lat1: f64, lon1: f64, lat2: f64, lon2: f64) -> f64 {
    let d_lat = (lat2 - lat1).to_radians();
    let d_lon = (lon2 - lon1).to_radians();

    let r_lat1 = lat1.to_radians();
    let r_lat2 = lat2.to_radians();

    let a = (d_lat / 2.0).sin().powi(2)
        + r_lat1.cos() * r_lat2.cos() * (d_lon / 2.0).sin().powi(2);
    let c = 2.0 * a.sqrt().atan2((1.0 - a).sqrt());

    ((EARTH_RADIUS_KM * c) * 10.0).round() / 10.0
}

/// 1. Filtra y ordena negocios por distancia real (Haversine) en milisegundos.
#[tauri::command]
fn filter_and_sort_by_distance(
    user_lat: f64,
    user_lng: f64,
    max_radius_km: f64,
    businesses_json: String,
) -> Result<String, String> {
    let items: Vec<BusinessGeoItem> = serde_json::from_str(&businesses_json)
        .map_err(|e| format!("Error al deserializar negocios: {}", e))?;

    let mut nearby: Vec<BusinessGeoItem> = items
        .into_iter()
        .filter_map(|mut item| {
            let dist = haversine_km(user_lat, user_lng, item.approx_lat, item.approx_lng);
            if max_radius_km <= 0.0 || dist <= max_radius_km {
                item.distance_km = dist;
                Some(item)
            } else {
                None
            }
        })
        .collect();

    nearby.sort_by(|a, b| {
        a.distance_km
            .partial_cmp(&b.distance_km)
            .unwrap_or(Ordering::Equal)
    });

    serde_json::to_string(&nearby)
        .map_err(|e| format!("Error al serializar negocios: {}", e))
}

/// 2. Guarda el caché offline en app_data_dir()/nafe_offline_cache.json
#[tauri::command]
fn save_offline_cache(app: tauri::AppHandle, payload_json: String) -> Result<(), String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("No se pudo resolver app_data_dir: {}", e))?;

    fs::create_dir_all(&dir)
        .map_err(|e| format!("No se pudo crear el directorio de caché: {}", e))?;

    let file_path = dir.join(OFFLINE_CACHE_FILE);
    fs::write(&file_path, payload_json.as_bytes())
        .map_err(|e| format!("Error al escribir caché offline: {}", e))
}

/// 3. Lee el caché offline guardado en app_data_dir()/nafe_offline_cache.json
#[tauri::command]
fn load_offline_cache(app: tauri::AppHandle) -> Result<String, String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("No se pudo resolver app_data_dir: {}", e))?;

    let file_path = dir.join(OFFLINE_CACHE_FILE);
    if !file_path.exists() {
        return Ok("[]".to_string());
    }

    fs::read_to_string(&file_path)
        .map_err(|e| format!("Error al leer caché offline: {}", e))
}

/// 4. Dispara notificación nativa en Android / Desktop cuando un favorito tiene stock.
#[tauri::command]
fn notify_favorite_stock(
    app: tauri::AppHandle,
    title: String,
    body: String,
) -> Result<(), String> {
    app.notification()
        .builder()
        .title(&title)
        .body(&body)
        .show()
        .map_err(|e| format!("Error al mostrar notificación nativa: {}", e))
}

/// 5. Envía el correo OTP directamente vía Resend API desde Rust (sin CORS ni dependencia de Render).
#[tauri::command]
async fn send_resend_otp_email(
    to: String,
    name: String,
    code: String,
) -> Result<bool, String> {
    let api_key = option_env!("RESEND_API_KEY")
        .unwrap_or("re_AAzo6FsC_F3HrNEnGf8oQPYwfnyeP5yqU");
    let from_addr = option_env!("RESEND_FROM").unwrap_or("onboarding@resend.dev");
    let display_name = if name.trim().is_empty() {
        "vecino"
    } else {
        name.trim()
    };

    let payload = serde_json::json!({
        "from": format!("NAFE <{}>", from_addr),
        "to": [to.trim()],
        "subject": format!("Tu código de verificación NAFE: {}", code),
        "html": format!(
            "<div style=\"font-family:sans-serif;padding:20px;color:#13150C;background:#F7F7F4;\"><h2 style=\"margin:0 0 12px;\">Hola, {}</h2><p style=\"margin:0 0 16px;\">Tu código de verificación para NAFE es:</p><p style=\"font-size:28px;font-weight:700;letter-spacing:6px;color:#2B4628;margin:0 0 16px;\">{}</p><p style=\"font-size:12px;color:#6E6D5F;\">Expira en 10 minutos.</p></div>",
            display_name, code
        )
    });

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(6))
        .build()
        .map_err(|e| format!("Error cliente HTTP: {}", e))?;
    let res = client
        .post("https://api.resend.com/emails")
        .header("Authorization", format!("Bearer {}", api_key))
        .header("Content-Type", "application/json")
        .json(&payload)
        .send()
        .await
        .map_err(|e| format!("Error de red Resend: {}", e))?;

    Ok(res.status().is_success())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_geolocation::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            filter_and_sort_by_distance,
            save_offline_cache,
            load_offline_cache,
            notify_favorite_stock,
            send_resend_otp_email
        ])
        .run(tauri::generate_context!())
        .expect("error al ejecutar la aplicación Tauri NAFE");
}
