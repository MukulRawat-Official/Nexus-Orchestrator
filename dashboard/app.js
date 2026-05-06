const socket = io();
const term = document.getElementById("terminal-output");
const coreGrid = document.getElementById("core-grid");
let coreCharts = [];

// Terminal auto-scrolling and trimming
socket.on("terminal_log", (html) => {
  if (!term) return;
  const div = document.createElement("div");
  div.innerHTML = html;
  term.appendChild(div);
  term.scrollTop = term.scrollHeight;
  if (term.childNodes.length > 60) term.removeChild(term.firstChild);
});

// Chart.js helper factory
const createChart = (id, color) => {
  const el = document.getElementById(id);
  if (!el) return null;
  return new Chart(el.getContext("2d"), {
    type: "line",
    data: {
      labels: Array(25).fill(""),
      datasets: [
        {
          data: Array(25).fill(0),
          borderColor: color,
          backgroundColor: color + "10",
          fill: true,
          pointRadius: 0,
          borderWidth: 2,
          tension: 0.4,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: { display: false },
        y: { display: false, min: 0, max: 100 },
      },
      plugins: { legend: { display: false } },
    },
  });
};

const memChart = createChart("memChart", "#a855f7");
const gpuChart = createChart("gpuChart", "#14b8a6");

socket.on("hardware_metrics_update", (data) => {
  const pushData = (chart, val) => {
    if (!chart) return;
    chart.data.datasets[0].data.push(val);
    chart.data.datasets[0].data.shift();
    chart.update("none");
  };

  pushData(memChart, data.mem);
  pushData(gpuChart, data.gpu);

  // Initial Core Generation
  if (coreCharts.length === 0 && data.cpuCores && coreGrid) {
    data.cpuCores.forEach((_, i) => {
      const card = document.createElement("div");
      card.className =
        "core-card p-3 rounded-xl flex flex-col justify-between shadow-lg";
      card.innerHTML = `
                <div class="flex justify-between items-center text-[8px] font-bold text-zinc-500">
                    <span>CORE_${i}</span>
                    <span id="pct-${i}" class="text-cyan-400">0%</span>
                </div>
                <div class="flex-grow min-h-0"><canvas id="core-chart-${i}"></canvas></div>
            `;
      coreGrid.appendChild(card);
      coreCharts.push({
        chart: createChart(`core-chart-${i}`, "#06b6d4"),
        pct: document.getElementById(`pct-${i}`),
      });
    });
  }

  // Per-core updates
  data.cpuCores.forEach((load, i) => {
    if (!coreCharts[i]) return;
    pushData(coreCharts[i].chart, load);
    coreCharts[i].pct.innerText = `${load}%`;
    coreCharts[i].pct.style.color = load > 85 ? "#f43f5e" : "#06b6d4";
  });
});

socket.on("system_metrics_update", (data) => {
  document.getElementById("workerCount").innerText =
    `${String(data.swarm.current).padStart(2, "0")}/${String(data.swarm.max).padStart(2, "0")}`;
  document.getElementById("valSuccess").innerText =
    data.counters.success.toLocaleString();
  document.getElementById("valQueue").innerText =
    data.counters.queueSize.toLocaleString();
  document.getElementById("valRetries").innerText = data.counters.retries
    ? data.counters.retries.toLocaleString()
    : "0";

  const btnPauseProd = document.getElementById("btnPauseProd");
  if (btnPauseProd) {
    if (data.meta.producerPaused) {
      btnPauseProd.innerText = "Resume Producer";
      btnPauseProd.className =
        "w-full bg-amber-600 text-white py-2 rounded font-bold text-[9px] uppercase shadow-lg transition-all";
      btnPauseProd.classList.remove("hidden");
    } else {
      btnPauseProd.innerText = "Pause Producer";
      btnPauseProd.className =
        "w-full bg-zinc-800 text-zinc-500 py-2 rounded font-bold text-[9px] uppercase hover:bg-zinc-700 transition-all";
    }
  }
});
