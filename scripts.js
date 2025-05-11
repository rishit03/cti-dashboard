let refreshInterval = null;
let countdown = 30;
let countdownTimer = null;

function loadData() {
  document.getElementById("severityFilter").value = localStorage.getItem("selectedSeverity") || "";
  document.getElementById("sourceFilter").value = localStorage.getItem("selectedSource") || "";

  const severity = document.getElementById("severityFilter").value;
  const source = document.getElementById("sourceFilter").value;
  const url = new URL("https://cti-dashboard-9j95.onrender.com/cti-data");

  const tbody = document.getElementById("cti-table-body");
  const chartCanvas = document.getElementById("sourceChart");
  const severityCanvas = document.getElementById("severityChart");
  const spinner = document.getElementById("loadingSpinner");
  const chartCard = document.getElementById("chartCard");

  spinner.style.display = "block";
  chartCard.style.display = "none";
  tbody.style.display = "none";

  if (severity) url.searchParams.append("severity", severity);
  if (source) url.searchParams.append("source", source);

  if (window.sourceChartInstance) window.sourceChartInstance.destroy();
  if (window.severityChartInstance) window.severityChartInstance.destroy();

  fetch(url)
    .then(res => res.json())
    .then(data => {
      spinner.style.display = "none";
      chartCard.style.display = "block";
      tbody.style.display = "table-row-group";

      if (!data || !Array.isArray(data.data) || data.data.length === 0) {
        tbody.innerHTML = `
          <tr>
            <td colspan='6' class='text-center text-muted py-4'>
              <i class='bi bi-database-x fs-4 d-block mb-2'></i>
              No threat indicators match your filter
            </td>
          </tr>`;
        updateStats(0, 0, 0);
        return;
      }

      const isDark = localStorage.getItem("theme") === "dark";
      const labelColor = isDark ? "#ffffff" : "#000000";
      const bgColors = isDark
        ? ["#ff6384", "#36a2eb", "#ffcd56", "#4bc0c0", "#9966ff"]
        : ["#dc3545", "#ffc107", "#0d6efd", "#20c997", "#6f42c1"];

      const sourceCount = {};
      const severityCount = {};
      tbody.innerHTML = "";

      data.data.forEach(entry => {
        const row = document.createElement("tr");

        const severityBadge = {
          High: `<span class='badge bg-danger' title='High: Many detections'><i class='bi bi-exclamation-triangle-fill me-1'></i>High</span>`,
          Medium: `<span class='badge bg-warning text-dark' title='Medium: Some detections'><i class='bi bi-exclamation-circle me-1'></i>Medium</span>`,
          Low: `<span class='badge bg-info text-dark' title='Low: Few or no detections'><i class='bi bi-info-circle me-1'></i>Low</span>`
        }[entry.severity] || `<span class='badge bg-secondary'>Unknown</span>`;

        const detailsRowId = `details-${entry.indicator.replace(/[^a-zA-Z0-9]/g, "")}`;
        row.classList.add("indicator-row");
        row.innerHTML = `
          <td class="fw-bold text-decoration-underline" style="cursor:pointer;" onclick="toggleDetails('${detailsRowId}', this)">
            <i class="bi bi-chevron-right me-1 toggle-icon"></i>${entry.indicator}
          </td>
          <td>${severityBadge}</td>
          <td>${entry.source}</td>
        `;

        tbody.appendChild(row);

        // Add hidden details row
        const detailsRow = document.createElement("tr");
        detailsRow.id = detailsRowId;
        detailsRow.classList.add("details-row");
        detailsRow.style.display = "none";
        const isDark = localStorage.getItem("theme") === "dark";
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



        sourceCount[entry.source] = (sourceCount[entry.source] || 0) + 1;
        severityCount[entry.severity] = (severityCount[entry.severity] || 0) + 1;
      });

      const total = data.data.length;
      const highSeverity = data.data.filter(d => d.severity === "High").length;
      const uniqueSources = new Set(data.data.map(d => d.source)).size;

      updateStats(total, highSeverity, uniqueSources);

      // Pie Chart
      window.sourceChartInstance = new Chart(chartCanvas.getContext("2d"), {
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
          plugins: {
            legend: { labels: { color: labelColor } }
          }
        }
      });

      // Bar Chart
      const orderedSeverities = ["High", "Medium", "Low"];
      const barLabels = orderedSeverities.filter(s => severityCount[s] !== undefined);
      const barData = barLabels.map(s => severityCount[s]);
      const barColors = barLabels.map(level =>
        level === "High" ? "#dc3545" : level === "Medium" ? "#ffc107" : "#0d6efd"
      );

      window.severityChartInstance = new Chart(severityCanvas.getContext("2d"), {
        type: "bar",
        data: {
          labels: barLabels,
          datasets: [{
            label: "Indicators by Severity",
            data: barData,
            backgroundColor: barColors
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
    })
    .catch(error => {
      console.error("Error fetching CTI data:", error);
      spinner.style.display = "none";
      chartCard.style.display = "block";
      tbody.style.display = "table-row-group";
      tbody.innerHTML = "<tr><td colspan='6' class='text-center text-danger'>Failed to load data</td></tr>";
      updateStats(0, 0, 0);
    });
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
        timerDisplay.textContent = `Refreshing in: ${countdown}s`;
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

  document.querySelectorAll("table").forEach(tbl =>
    tbl.classList.toggle("table-dark", isDark)
  );

  document.querySelectorAll(".card").forEach(card => {
    card.classList.remove("bg-light", "bg-dark", "text-light", "text-white");
    if (isDark) {
      card.classList.add("bg-dark", "text-white");
    } else {
      card.classList.add("bg-light", "text-dark");
    }
  });

  // Specific colors for stat cards
  document.getElementById("cardTotal").className =
    "card shadow-sm border-0 " + (isDark ? "bg-primary text-white" : "bg-primary text-white");
  document.getElementById("cardHigh").className =
    "card shadow-sm border-0 " + (isDark ? "bg-danger text-white" : "bg-danger text-white");
  document.getElementById("cardSource").className =
    "card shadow-sm border-0 " + (isDark ? "bg-info text-white" : "bg-info text-white");
  document.getElementById("cardUpdated").className =
    "card shadow-sm border-0 " + (isDark ? "bg-secondary text-white" : "bg-dark text-white");

  document.getElementById("themeIcon").className = isDark ? "bi bi-moon-fill" : "bi bi-sun-fill";
}

function toggleDetails(id, cell) {
  const row = document.getElementById(id);
  const icon = cell.querySelector(".toggle-icon");
  if (row.style.display === "none") {
    row.style.display = "table-row";
    icon.classList.remove("bi-chevron-right");
    icon.classList.add("bi-chevron-down");
  } else {
    row.style.display = "none";
    icon.classList.remove("bi-chevron-down");
    icon.classList.add("bi-chevron-right");
  }
}



applyTheme();
loadData();
