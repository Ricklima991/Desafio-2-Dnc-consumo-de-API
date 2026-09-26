/* DncWeather · consumo de API (ViaCEP + Open-Meteo, sem chave) */
const $ = (id) => document.getElementById(id);

/* Código WMO -> texto PT + ícone */
function weatherInfo(code) {
  if (code === 0) return { label: "Céu limpo", icon: "fa-sun" };
  if (code <= 3) return { label: "Parcialmente nublado", icon: "fa-cloud-sun" };
  if (code <= 48) return { label: "Nevoeiro", icon: "fa-smog" };
  if (code <= 67) return { label: "Chuva", icon: "fa-cloud-rain" };
  if (code <= 77) return { label: "Neve", icon: "fa-snowflake" };
  if (code <= 82) return { label: "Pancadas de chuva", icon: "fa-cloud-showers-heavy" };
  return { label: "Tempestade", icon: "fa-cloud-bolt" };
}

const DAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

/* Máscara de CEP: 00000-000 */
$("cep").addEventListener("input", (e) => {
  const d = e.target.value.replace(/\D/g, "").slice(0, 8);
  e.target.value = d.length > 5 ? d.slice(0, 5) + "-" + d.slice(5) : d;
});

function setError(msg) { $("formError").textContent = msg || ""; }

function setLoading(on) {
  const btn = $("btnBuscar");
  btn.disabled = on;
  btn.querySelector("span").textContent = on ? "Buscando..." : "Buscar previsão";
}

async function buscar() {
  setError("");
  const cep = $("cep").value.replace(/\D/g, "");
  const lat = $("lat").value.trim().replace(",", ".");
  const lon = $("long").value.trim().replace(",", ".");

  if (cep.length !== 8) { setError("Digite um CEP válido com 8 números."); return; }
  if (!lat || !lon || isNaN(lat) || isNaN(lon)) {
    setError("Digite latitude e longitude válidas (ou use sua localização).");
    return;
  }

  setLoading(true);
  try {
    const [addrRes, wxRes] = await Promise.all([
      fetch(`https://viacep.com.br/ws/${cep}/json/`).then((r) => r.json()),
      fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
        `&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m` +
        `&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=7`
      ).then((r) => r.json())
    ]);

    if (addrRes.erro) { setError("CEP não encontrado. Confira o número."); return; }
    renderAddress(addrRes);
    renderForecast(wxRes, `${addrRes.localidade}/${addrRes.uf}`);

    $("resultado").classList.remove("hidden");
    $("resultado").scrollIntoView({ behavior: "smooth" });
  } catch {
    setError("Falha na conexão. Tente novamente em instantes.");
  } finally {
    setLoading(false);
  }
}

function renderAddress(a) {
  $("rua").textContent = a.logradouro || "—";
  $("bairro").textContent = a.bairro || "—";
  $("estado").textContent = `${a.localidade || "—"}/${a.uf || "—"}`;
}

function renderForecast(wx, place) {
  const c = wx.current;
  const info = weatherInfo(c.weather_code);
  $("nowIcon").className = `fa-solid ${info.icon}`;
  $("nowTemp").textContent = `${Math.round(c.temperature_2m)}°`;
  $("nowDesc").textContent = info.label;
  $("nowPlace").textContent = place;
  $("nowHum").textContent = `${c.relative_humidity_2m}% umidade`;
  $("nowWind").textContent = `${Math.round(c.wind_speed_10m)} km/h`;
  $("nowFeels").textContent = `Sensação ${Math.round(c.apparent_temperature)}°`;

  const week = $("week");
  week.innerHTML = "";
  wx.daily.time.forEach((date, i) => {
    const d = new Date(date + "T12:00:00");
    const w = weatherInfo(wx.daily.weather_code[i]);
    const el = document.createElement("div");
    el.className = "day";
    el.innerHTML =
      `<small>${i === 0 ? "Hoje" : DAYS[d.getDay()]}</small>` +
      `<i class="fa-solid ${w.icon}"></i>` +
      `<strong>${Math.round(wx.daily.temperature_2m_max[i])}°</strong>` +
      `<span>${Math.round(wx.daily.temperature_2m_min[i])}°</span>`;
    week.appendChild(el);
  });
}

/* Geolocalização preenche lat/long */
$("btnGeo").addEventListener("click", () => {
  if (!navigator.geolocation) { setError("Seu navegador não suporta geolocalização."); return; }
  setError("");
  $("btnGeo").innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Localizando...';
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      $("lat").value = pos.coords.latitude.toFixed(4);
      $("long").value = pos.coords.longitude.toFixed(4);
      $("btnGeo").innerHTML = '<i class="fa-solid fa-location-crosshairs"></i> Usar minha localização';
      setError("");
    },
    () => {
      $("btnGeo").innerHTML = '<i class="fa-solid fa-location-crosshairs"></i> Usar minha localização';
      setError("Não foi possível obter sua localização. Digite manualmente.");
    }
  );
});

$("btnBuscar").addEventListener("click", buscar);
[$("cep"), $("lat"), $("long")].forEach((el) =>
  el.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); buscar(); } })
);

/* Confirmação do formulário de alertas */
$("leadForm").addEventListener("submit", () => {
  setTimeout(() => {
    $("leadOk").textContent = "Cadastro feito! Bem-vindo aos alertas do tempo.";
    $("leadForm").reset();
  }, 800);
});
