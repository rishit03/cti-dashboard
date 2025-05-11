function loadData() {
    const severity = document.getElementById("severityFilter").value;
    const source = document.getElementById("sourceFilter").value;
    const url = new URL("https://cti-dashboard-9j95.onrender.com/cti-data");
  
    if (severity) url.searchParams.append("severity", severity);
    if (source) url.searchParams.append("source", source);
  
    const tbody = document.getElementById("cti-table-body");
    const chartCanvas = document.getElementById("sourceChart");
    const severityCanvas = document.getElementById("severityChart");
  
    tbody.innerHTML = "";
  
    if (window.sourceChartInstance) window.sourceChartInstance.destroy();
    if (window.severityChartInstance) window.severityChartInstance.destroy();
  
    fetch(url)
      .then(res => res.json())
      .then(data => {
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
  
        const sourceCount = {};
        const severityCount = {};
  
        data.data.forEach(entry => {
          const row = document.createElement("tr");
  
          const severityBadge = {
            High: `<span class='badge bg-danger' title='High: Many detections'><i class='bi bi-exclamation-triangle-fill me-1'></i>High</span>`,
            Medium: `<span class='badge bg-warning text-dark' title='Medium: Some detections'><i class='bi bi-exclamation-circle me-1'></i>Medium</span>`,
            Low: `<span class='badge bg-info text-dark' title='Low: Few or no detections'><i class='bi bi-info-circle me-1'></i>Low</span>`
          }[entry.severity] || `<span class='badge bg-secondary'>Unknown</span>`;
  
          row.innerHTML = `
            <td>${entry.indicator}</td>
            <td>${entry.type}</td>
            <td>${entry.source}</td>
            <td>${severityBadge}</td>
            <td>${entry.categories.join(", ")}</td>
            <td>${entry.reported_at}</td>
          `;
          tbody.appendChild(row);
  
          sourceCount[entry.source] = (sourceCount[entry.source] || 0) + 1;
          severityCount[entry.severity] = (severityCount[entry.severity] || 0) + 1;
        });
  
        const total = data.data.length;
        const highSeverity = data.data.filter(d => d.severity === "High").length;
        const uniqueSources = new Set(data.data.map(d => d.source)).size;
  
        updateStats(total, highSeverity, uniqueSources);
  
        // Pie Chart
        const ctxPie = chartCanvas.getContext('2d');
        window.sourceChartInstance = new Chart(ctxPie, {
          type: 'pie',
          data: {
            labels: Object.keys(sourceCount),
            datasets: [{
              label: 'Threats by Source',
              data: Object.values(sourceCount),
              backgroundColor: ["#dc3545", "#ffc107", "#0d6efd", "#20c997"]
            }]
          },
          options: {
            animation: { duration: 1000, easing: "easeOutQuart" },
            plugins: {
              legend: {
                labels: { color: "#000" }
              }
            }
          }
        });
  
        // Bar Chart (sorted)
        const ctxBar = severityCanvas.getContext('2d');
        const orderedSeverities = ["High", "Medium", "Low"];
        const barLabels = orderedSeverities.filter(s => severityCount[s] !== undefined);
        const barData = barLabels.map(s => severityCount[s]);
        const barColors = barLabels.map(level =>
          level === "High" ? "#dc3545" :
          level === "Medium" ? "#ffc107" :
          "#0d6efd"
        );
  
        window.severityChartInstance = new Chart(ctxBar, {
          type: 'bar',
          data: {
            labels: barLabels,
            datasets: [{
              label: 'Indicators by Severity',
              data: barData,
              backgroundColor: barColors
            }]
          },
          options: {
            animation: { duration: 1000, easing: "easeOutQuart" },
            responsive: true,
            plugins: {
              legend: { display: false }
            },
            scales: {
              y: {
                beginAtZero: true,
                ticks: { stepSize: 1, color: "#000" },
                title: {
                  display: true,
                  text: "Number of Indicators",
                  color: "#000",
                  font: { size: 14, weight: "bold" }
                }
              },
              x: {
                ticks: { color: "#000" },
                title: {
                  display: true,
                  text: "Severity Level",
                  color: "#000",
                  font: { size: 14, weight: "bold" }
                }
              }
            }
          }
        });
      })
      .catch(error => {
        console.error("Error fetching CTI data:", error);
        tbody.innerHTML = "<tr><td colspan='6' class='text-center text-danger'>Failed to load data</td></tr>";
        updateStats(0, 0, 0);
      });
  }
  
  // Stats card updater
  function updateStats(total, high, sources) {
    document.getElementById("lastUpdated").textContent = new Date().toLocaleTimeString();
  
    const totalCounter = new CountUp("totalCount", total, { startVal: 0 });
    const highCounter = new CountUp("highCount", high, { startVal: 0 });
    const sourceCounter = new CountUp("sourceCount", sources, { startVal: 0 });
  
    if (!totalCounter.error) totalCounter.start(); else document.getElementById("totalCount").textContent = total;
    if (!highCounter.error) highCounter.start(); else document.getElementById("highCount").textContent = high;
    if (!sourceCounter.error) sourceCounter.start(); else document.getElementById("sourceCount").textContent = sources;
  }
  
  // Load on startup
  loadData();
  
