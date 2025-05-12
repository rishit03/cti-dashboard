let refreshInterval = null;
let countdown = 30;
let countdownTimer = null;

let allCTIData = [];
let currentPage = 1;
const rowsPerPage = 25;

function loadData() {
  document.getElementById("severityFilter").value = localStorage.getItem("selectedSeverity") || "";
  document.getElementById("sourceFilter").value = localStorage.getItem("selectedSource") || "";

  const severity = document.getElementById("severityFilter").value;
  const source = document.getElementById("sourceFilter").value;
  const url = new URL("https://cti-dashboard-9j95.onrender.com/cti-data");

  const spinner = document.getElementById("loadingSpinner");
  const chartCard = document.getElementById("chartCard");

  spinner.style.display = "block";
  chartCard.style.display = "none";

  if (severity) url.searchParams.append("severity", severity);
  if (source) url.searchParams.append("source", source);

  if (window.sourceChartInstance) window.sourceChartInstance.destroy();
  if (window.severityChartInstance) window.severityChartInstance.destroy();

  fetch(url)
    .then(res => res.json())
    .then(data => {
      spinner.style.display = "none";
      chartCard.style.display = "block";

      allCTIData = data.data || [];
      currentPage = 1;
      renderTablePage();

      const isDark = localStorage.getItem("theme") === "dark";
      const labelColor = isDark ? "#ffffff" : "#000000";
      const bgColors = isDark
        ? ["#ff6384", "#36a2eb", "#ffcd56", "#4bc0c0", "#9966ff"]
        : ["#dc3545", "#ffc107", "#0d6efd", "#20c997", "#6f42c1"];

      const sourceCount = {};
      const severityCount = {};
      data.data.forEach(entry => {
        sourceCount[entry.source] = (sourceCount[entry.source] || 0) + 1;
        severityCount[entry.severity] = (severityCount[entry.severity] || 0) + 1;
      });

      window.sourceChartInstance = new Chart(document.getElementById("sourceChart").getContext("2d"), {
        type: "pie",
        data: {
          labels: Object.keys(sourceCount),
          datasets: [{
            label: "Threats by Source",
            data: Object.values(sourceCount),
            backgroundColor: bgColors
          }]
        },
        options: {
          animation: { duration: 1000, easing: "easeOutQuart" },
          plugins: { legend: { labels: { color: labelColor } } }
        }
      });

      window.severityChartInstance = new Chart(document.getElementById("severityChart").getContext("2d"), {
        type: "bar",
        data: {
          labels: Object.keys(severityCount),
          datasets: [{
            label: "Indicators by Severity",
            data: Object.values(severityCount),
            backgroundColor: Object.keys(severityCount).map(level =>
              level === "High" ? "#dc3545" : level === "Medium" ? "#ffc107" : "#0d6efd"
            )
          }]
        },
        options: {
          animation: { duration: 1000, easing: "easeOutQuart" },
          responsive: true,
          plugins: { legend: { display: false } },
          scales: {
            y: {
              beginAtZero: true,
              ticks: { stepSize: 1, color: labelColor },
              title: {
                display: true,
                text: "Number of Indicators",
                color: labelColor,
                font: { size: 14, weight: "bold" }
              }
            },
            x: {
              ticks: { color: labelColor },
              title: {
                display: true,
                text: "Severity Level",
                color: labelColor,
                font: { size: 14, weight: "bold" }
              }
            }
          }
        }
      });

      if (data.errors && data.errors.length > 0) {
        const msg = `⚠️ The following sources failed or hit limits: ${data.errors.join(", ")}`;
        document.getElementById("toastMessage").textContent = msg;
        const toastEl = document.getElementById("errorToast");
        const toast = new bootstrap.Toast(toastEl);
        toast.show();
      }
    })
    .catch(error => {
      console.error("Error fetching CTI data:", error);
      document.getElementById("cti-table-body").innerHTML =
        "<tr><td colspan='3' class='text-center text-danger'>Failed to load data</td></tr>";
      updateStats(0, 0, 0);
    });
}

function renderTablePage() {
  const searchValue = document.getElementById("searchInput")?.value.toLowerCase() || "";
  const filteredData = allCTIData.filter(item =>
    item.indicator.toLowerCase().includes(searchValue)
  );

  const tbody = document.getElementById("cti-table-body");
  const pagination = document.getElementById("paginationControls");
  tbody.innerHTML = "";
  pagination.innerHTML = "";

  const totalPages = Math.ceil(filteredData.length / rowsPerPage);
  const start = (currentPage - 1) * rowsPerPage;
  const end = start + rowsPerPage;
  const pageData = filteredData.slice(start, end);

  const isDark = localStorage.getItem("theme") === "dark";

  pageData.forEach(entry => {
    const row = document.createElement("tr");
    const severityBadge = {
      High: `<span class='badge bg-danger'>High</span>`,
      Medium: `<span class='badge bg-warning text-dark'>Medium</span>`,
      Low: `<span class='badge bg-info text-dark'>Low</span>`
    }[entry.severity] || `<span class='badge bg-secondary'>Unknown</span>`;

    const detailsRowId = `details-${entry.indicator.replace(/[^a-zA-Z0-9]/g, "")}`;
    row.innerHTML = `
      <td class="fw-bold text-decoration-underline" style="cursor:pointer;" onclick="toggleDetails('${detailsRowId}', this)">
        <i class="bi bi-chevron-right me-1 toggle-icon"></i>${entry.indicator}
      </td>
      <td>${severityBadge}</td>
      <td>${entry.source}</td>
    `;
    tbody.appendChild(row);

    const detailsRow = document.createElement("tr");
    detailsRow.id = detailsRowId;
    detailsRow.style.display = "none";
    detailsRow.innerHTML = `
      <td colspan="3">
        <div class="p-2 rounded small fw-normal ${isDark ? 'bg-dark text-light border-secondary' : 'bg-light text-dark border'}">
          <strong>Type:</strong> ${entry.type} <br/>
          <strong>Categories:</strong> ${entry.categories.join(", ")} <br/>
          <strong>Reported At:</strong> ${entry.reported_at}
        </div>
      </td>
    `;
    tbody.appendChild(detailsRow);
  });

  const createPageBtn = (label, page, active = false, disabled = false) => {
    const btn = document.createElement("button");
    btn.className = `btn btn-sm ${active ? "btn-primary" : "btn-outline-primary"} me-1`;
    btn.textContent = label;
    if (disabled) btn.disabled = true;
    btn.onclick = () => {
      currentPage = page;
      renderTablePage();
    };
    return btn;
  };

  pagination.appendChild(createPageBtn("« First", 1, false, currentPage === 1));
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || Math.abs(i - currentPage) <= 2) {
      pagination.appendChild(createPageBtn(i, i, i === currentPage));
    } else if (i === 2 || i === totalPages - 1) {
      const dots = document.createElement("span");
      dots.className = "text-muted me-2";
      dots.textContent = "...";
      pagination.appendChild(dots);
    }
  }
  pagination.appendChild(createPageBtn("Last »", totalPages, false, currentPage === totalPages));

  const pageIndicator = document.getElementById("pageIndicator");
  pageIndicator.textContent = `Page ${currentPage} of ${totalPages}`;

  // ✅ Update stats based on filtered data
  const total = filteredData.length;
  const highSeverity = filteredData.filter(d => d.severity === "High").length;
  const uniqueSources = new Set(filteredData.map(d => d.source)).size;
  updateStats(total, highSeverity, uniqueSources);
}


function toggleDetails(id, cell) {
  const row = document.getElementById(id);
  const icon = cell.querySelector(".toggle-icon");
  if (row.style.display === "none") {
    row.style.display = "table-row";
    icon.classList.replace("bi-chevron-right", "bi-chevron-down");
  } else {
    row.style.display = "none";
    icon.classList.replace("bi-chevron-down", "bi-chevron-right");
  }
}

function toggleAutoRefresh() {
  const toggle = document.getElementById("autoRefreshToggle");
  const timerDisplay = document.getElementById("countdownTimer");

  if (toggle.checked) {
    countdown = 30;
    timerDisplay.style.display = "block";
    timerDisplay.textContent = `Refreshing in: ${countdown}s`;

    countdownTimer = setInterval(() => {
      countdown--;
      timerDisplay.textContent = `Refreshing in: ${countdown}s`;
      if (countdown <= 0) {
        loadData();
        countdown = 30;
      }
    }, 1000);
  } else {
    clearInterval(countdownTimer);
    timerDisplay.style.display = "none";
  }
}

function saveFilters() {
  localStorage.setItem("selectedSeverity", document.getElementById("severityFilter").value);
  localStorage.setItem("selectedSource", document.getElementById("sourceFilter").value);
}

function updateStats(total, high, sources) {
  document.getElementById("lastUpdated").textContent = new Date().toLocaleTimeString();
  const totalCounter = new CountUp("totalCount", total, { startVal: 0 });
  const highCounter = new CountUp("highCount", high, { startVal: 0 });
  const sourceCounter = new CountUp("sourceCount", sources, { startVal: 0 });

  if (!totalCounter.error) totalCounter.start(); else document.getElementById("totalCount").textContent = total;
  if (!highCounter.error) highCounter.start(); else document.getElementById("highCount").textContent = high;
  if (!sourceCounter.error) sourceCounter.start(); else document.getElementById("sourceCount").textContent = sources;
}

function toggleTheme() {
  const dark = document.getElementById("themeToggle").checked;
  localStorage.setItem("theme", dark ? "dark" : "light");
  applyTheme();
  loadData();
}

function applyTheme() {
  const isDark = localStorage.getItem("theme") === "dark";
  document.getElementById("themeToggle").checked = isDark;

  document.body.classList.toggle("bg-dark", isDark);
  document.body.classList.toggle("text-light", isDark);

  document.querySelectorAll("table").forEach(tbl => tbl.classList.toggle("table-dark", isDark));

  document.querySelectorAll(".card").forEach(card => {
    card.classList.remove("bg-light", "bg-dark", "text-light", "text-white", "text-dark");
    if (isDark) {
      card.classList.add("bg-dark", "text-white");
    } else {
      card.classList.add("bg-light", "text-dark");
    }
  });

  document.getElementById("cardTotal").className = "card shadow-sm border-0 " + (isDark ? "bg-primary text-white" : "bg-primary text-white");
  document.getElementById("cardHigh").className = "card shadow-sm border-0 " + (isDark ? "bg-danger text-white" : "bg-danger text-white");
  document.getElementById("cardSource").className = "card shadow-sm border-0 " + (isDark ? "bg-info text-white" : "bg-info text-white");
  document.getElementById("cardUpdated").className = "card shadow-sm border-0 " + (isDark ? "bg-secondary text-white" : "bg-dark text-white");

  document.getElementById("themeIcon").className = isDark ? "bi bi-moon-fill" : "bi bi-sun-fill";
}

function jumpToPage() {
  const input = document.getElementById("jumpPage");
  const totalPages = Math.ceil(allCTIData.filter(item =>
    item.indicator.toLowerCase().includes(
      document.getElementById("searchInput")?.value.toLowerCase() || ""
    )
  ).length / rowsPerPage);

  let page = parseInt(input.value);
  if (isNaN(page) || page < 1) page = 1;
  if (page > totalPages) page = totalPages;

  currentPage = page;
  renderTablePage();
}

function lookupVTIp() {
  const ip = document.getElementById("vtIpInput").value.trim();
  const resultBox = document.getElementById("vtResult");

  if (!ip) {
    resultBox.innerHTML = "<div class='text-danger'>⚠️ Please enter a valid IP address.</div>";
    return;
  }

  resultBox.innerHTML = "<div class='text-muted'>⏳ Fetching from VirusTotal...</div>";

  fetch(`https://cti-dashboard-9j95.onrender.com/vt-lookup?ip=${ip}`)
    .then(res => res.json())
    .then(data => {
      if (data.error) {
        resultBox.innerHTML = `<div class='text-danger'>❌ ${data.error}</div>`;
        return;
      }

      resultBox.innerHTML = `
        <div><strong>IP:</strong> ${ip}</div>
        <div><strong>Malicious:</strong> ${data.malicious}</div>
        <div><strong>Suspicious:</strong> ${data.suspicious}</div>
        <div><strong>Last Seen:</strong> ${data.last_analysis}</div>
        <div><strong>Tags:</strong> ${data.tags.join(", ")}</div>
        <div class="mt-2"><a href="https://www.virustotal.com/gui/ip-address/${ip}" target="_blank" class="btn btn-sm btn-outline-secondary">View on VirusTotal</a></div>
      `;
    })
    .catch(err => {
      console.error(err);
      resultBox.innerHTML = "<div class='text-danger'>⚠️ Failed to fetch data from backend.</div>";
    });
}


document.addEventListener("keydown", (e) => {
  if (!allCTIData.length) return;

  const searchValue = document.getElementById("searchInput")?.value.toLowerCase() || "";
  const filteredLength = allCTIData.filter(item =>
    item.indicator.toLowerCase().includes(searchValue)
  ).length;

  const totalPages = Math.ceil(filteredLength / rowsPerPage);
  if (e.key === "ArrowLeft" && currentPage > 1) {
    currentPage--;
    renderTablePage();
  } else if (e.key === "ArrowRight" && currentPage < totalPages) {
    currentPage++;
    renderTablePage();
  }
});

applyTheme();
loadData();
