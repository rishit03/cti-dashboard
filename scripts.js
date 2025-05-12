let refreshInterval = null;
let countdown = 30;
let countdownTimer = null;

let allCTIData = [];
let currentPage = 1;
const rowsPerPage = 25;

// Chart instances
let sourceChartInstance = null;
let severityChartInstance = null;

/**
 * Fetches CTI data from the backend and updates the dashboard.
 */
function loadData() {
  const severityFilter = document.getElementById("severityFilter");
  const sourceFilter = document.getElementById("sourceFilter");

  // Load saved filters
  if (severityFilter) severityFilter.value = localStorage.getItem("selectedSeverity") || "";
  if (sourceFilter) sourceFilter.value = localStorage.getItem("selectedSource") || "";

  const severity = severityFilter ? severityFilter.value : "";
  const source = sourceFilter ? sourceFilter.value : "";
  
  const url = new URL("https://cti-dashboard-9j95.onrender.com/cti-data");

  const spinner = document.getElementById("loadingSpinner");
  const chartCardContainer = document.getElementById("chartCardContainer"); // Changed from chartCard

  if (spinner) spinner.style.display = "block";
  if (chartCardContainer) chartCardContainer.style.display = "none"; // Hide the whole container

  if (severity) url.searchParams.append("severity", severity);
  if (source) url.searchParams.append("source", source);

  // Destroy existing charts before redrawing
  if (sourceChartInstance) sourceChartInstance.destroy();
  if (severityChartInstance) severityChartInstance.destroy();

  fetch(url)
    .then(res => {
        if (!res.ok) {
            throw new Error(`HTTP error! status: ${res.status}`);
        }
        return res.json();
    })
    .then(data => {
      if (spinner) spinner.style.display = "none";
      if (chartCardContainer) chartCardContainer.style.display = "block";

      allCTIData = data.data || [];
      currentPage = 1;
      renderTablePage();
      updateCharts(data.data || []);

      if (data.errors && data.errors.length > 0) {
        const msg = `⚠️ Some sources failed or had issues: ${data.errors.join(", ")}`;
        showToast(msg, "danger");
      }
    })
    .catch(error => {
      console.error("Error fetching CTI data:", error);
      if (spinner) spinner.style.display = "none";
      const tbody = document.getElementById("cti-table-body");
      if (tbody) {
        tbody.innerHTML =
        "<tr><td colspan=\"3\" class=\"text-center text-danger p-4\"><i class=\"bi bi-exclamation-triangle-fill me-2\"></i>Failed to load threat data. Please try refreshing.</td></tr>";
      }
      updateStats(0, 0, 0); // Reset stats
      showToast("Failed to load CTI data. Check console for details.", "danger");
    });
}

/**
 * Updates the charts with new data.
 * @param {Array} data - The CTI data array.
 */
function updateCharts(data) {
    const isDark = document.body.classList.contains("dark-theme");
    const labelColor = isDark ? getComputedStyle(document.documentElement).getPropertyValue("--body-color-dark").trim() : getComputedStyle(document.documentElement).getPropertyValue("--body-color-light").trim();
    const gridColor = isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)";

    const sourceCtx = document.getElementById("sourceChart")?.getContext("2d");
    const severityCtx = document.getElementById("severityChart")?.getContext("2d");

    if (!sourceCtx || !severityCtx) return;

    const sourceCounts = {};
    const severityCounts = {};
    data.forEach(entry => {
        sourceCounts[entry.source] = (sourceCounts[entry.source] || 0) + 1;
        severityCounts[entry.severity] = (severityCounts[entry.severity] || 0) + 1;
    });

    const chartFont = {
        family: "Inter, sans-serif",
        size: 12
    };

    sourceChartInstance = new Chart(sourceCtx, {
        type: "pie",
        data: {
            labels: Object.keys(sourceCounts),
            datasets: [{
                label: "Threats by Source",
                data: Object.values(sourceCounts),
                backgroundColor: [
                    getComputedStyle(document.documentElement).getPropertyValue("--bs-primary").trim(),
                    getComputedStyle(document.documentElement).getPropertyValue("--bs-success").trim(),
                    getComputedStyle(document.documentElement).getPropertyValue("--bs-info").trim(),
                    getComputedStyle(document.documentElement).getPropertyValue("--bs-warning").trim(),
                    getComputedStyle(document.documentElement).getPropertyValue("--bs-danger").trim(),
                ],
                borderColor: isDark ? getComputedStyle(document.documentElement).getPropertyValue("--card-bg-dark").trim() : getComputedStyle(document.documentElement).getPropertyValue("--card-bg-light").trim(),
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: { duration: 800, easing: "easeOutQuart" },
            plugins: {
                legend: { 
                    position: "bottom",
                    labels: { 
                        color: labelColor,
                        font: chartFont,
                        padding: 15
                    }
                },
                tooltip: {
                    titleFont: chartFont,
                    bodyFont: chartFont,
                    footerFont: chartFont
                }
            }
        }
    });

    severityChartInstance = new Chart(severityCtx, {
        type: "bar",
        data: {
            labels: Object.keys(severityCounts),
            datasets: [{
                label: "Indicators by Severity",
                data: Object.values(severityCounts),
                backgroundColor: Object.keys(severityCounts).map(level => {
                    if (level === "High") return getComputedStyle(document.documentElement).getPropertyValue("--danger-color").trim();
                    if (level === "Medium") return getComputedStyle(document.documentElement).getPropertyValue("--warning-color").trim();
                    return getComputedStyle(document.documentElement).getPropertyValue("--info-color").trim();
                }),
                borderRadius: 4,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: { duration: 800, easing: "easeOutQuart" },
            plugins: { 
                legend: { display: false },
                tooltip: {
                    titleFont: chartFont,
                    bodyFont: chartFont,
                    footerFont: chartFont
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { color: labelColor, font: chartFont, stepSize: Math.max(1, Math.ceil(Math.max(...Object.values(severityCounts))/5 || 1)) },
                    grid: { color: gridColor },
                    title: {
                        display: true,
                        text: "Number of Indicators",
                        color: labelColor,
                        font: { ...chartFont, weight: "600", size: 13 }
                    }
                },
                x: {
                    ticks: { color: labelColor, font: chartFont },
                    grid: { display: false }, // Cleaner look for bar chart x-axis
                    title: {
                        display: true,
                        text: "Severity Level",
                        color: labelColor,
                        font: { ...chartFont, weight: "600", size: 13 }
                    }
                }
            }
        }
    });
}

/**
 * Renders a single page of the CTI data table and pagination controls.
 */
function renderTablePage() {
  const searchInput = document.getElementById("searchInput");
  const searchValue = searchInput ? searchInput.value.toLowerCase() : "";
  
  const filteredData = allCTIData.filter(item =>
    item.indicator.toLowerCase().includes(searchValue) ||
    item.source.toLowerCase().includes(searchValue) ||
    item.type.toLowerCase().includes(searchValue)
  );

  const tbody = document.getElementById("cti-table-body");
  const paginationControls = document.getElementById("paginationControls");
  const pageIndicator = document.getElementById("pageIndicator");
  
  if (!tbody || !paginationControls || !pageIndicator) return;

  tbody.innerHTML = ""; // Clear existing rows
  paginationControls.innerHTML = ""; // Clear existing pagination

  if (filteredData.length === 0) {
    tbody.innerHTML = `<tr><td colspan="3" class="text-center p-4"><i class="bi bi-search me-2"></i>No indicators found matching your criteria.</td></tr>`;
    pageIndicator.textContent = "Showing 0 of 0 results";
    updateStats(0,0,0);
    return;
  }

  const totalPages = Math.ceil(filteredData.length / rowsPerPage);
  currentPage = Math.min(currentPage, totalPages); // Ensure currentPage is not out of bounds
  if (currentPage < 1) currentPage = 1;

  const start = (currentPage - 1) * rowsPerPage;
  const end = start + rowsPerPage;
  const pageData = filteredData.slice(start, end);

  pageData.forEach(entry => {
    const row = tbody.insertRow();
    row.setAttribute("role", "button");
    row.setAttribute("tabindex", "0");
    row.setAttribute("aria-label", `View details for indicator ${entry.indicator}`);
    row.onclick = () => showIndicatorModal(entry);
    row.onkeydown = (e) => { if (e.key === "Enter" || e.key === " ") showIndicatorModal(entry); };

    let severityBadgeHtml = "";
    switch (entry.severity) {
      case "High":
        severityBadgeHtml = `<span class=\"badge bg-danger text-white rounded-pill px-2 py-1\"><i class=\"bi bi-shield-fill-exclamation me-1\"></i>High</span>`;
        break;
      case "Medium":
        severityBadgeHtml = `<span class=\"badge bg-warning text-dark rounded-pill px-2 py-1\"><i class=\"bi bi-shield-fill-half me-1\"></i>Medium</span>`;
        break;
      case "Low":
        severityBadgeHtml = `<span class=\"badge bg-info text-dark rounded-pill px-2 py-1\"><i class=\"bi bi-shield-fill-check me-1\"></i>Low</span>`;
        break;
      default:
        severityBadgeHtml = `<span class=\"badge bg-secondary text-white rounded-pill px-2 py-1\"><i class=\"bi bi-shield-slash me-1\"></i>${entry.severity || "Unknown"}</span>`;
    }

    row.innerHTML = `
      <td class="fw-medium">
        <i class="bi bi-search me-2 text-primary opacity-75"></i>${entry.indicator}
        <span class="d-block small text-muted fst-italic">Type: ${entry.type}</span>
      </td>
      <td>${severityBadgeHtml}</td>
      <td>${entry.source}</td>
    `;
  });

  // Pagination logic
  const maxPagesToShow = 5;
  let startPage, endPage;
  if (totalPages <= maxPagesToShow) {
    startPage = 1;
    endPage = totalPages;
  } else {
    const maxPagesBeforeCurrent = Math.floor(maxPagesToShow / 2);
    const maxPagesAfterCurrent = Math.ceil(maxPagesToShow / 2) - 1;
    if (currentPage <= maxPagesBeforeCurrent) {
      startPage = 1;
      endPage = maxPagesToShow;
    } else if (currentPage + maxPagesAfterCurrent >= totalPages) {
      startPage = totalPages - maxPagesToShow + 1;
      endPage = totalPages;
    } else {
      startPage = currentPage - maxPagesBeforeCurrent;
      endPage = currentPage + maxPagesAfterCurrent;
    }
  }

  // First & Previous
  if (currentPage > 1) {
    paginationControls.appendChild(createPageBtn("« First", 1, false, false, "Go to first page"));
    paginationControls.appendChild(createPageBtn("‹ Prev", currentPage - 1, false, false, "Go to previous page"));
  }

  // Page numbers
  if (startPage > 1) {
    paginationControls.appendChild(createPageBtn("1", 1, false, false, "Go to page 1"));
    if (startPage > 2) {
        const dots = document.createElement("span");
        dots.className = "px-2 text-muted";
        dots.textContent = "...";
        paginationControls.appendChild(dots);
    }
  }

  for (let i = startPage; i <= endPage; i++) {
    paginationControls.appendChild(createPageBtn(i, i, i === currentPage, false, `Go to page ${i}`));
  }

  if (endPage < totalPages) {
    if (endPage < totalPages - 1) {
        const dots = document.createElement("span");
        dots.className = "px-2 text-muted";
        dots.textContent = "...";
        paginationControls.appendChild(dots);
    }
    paginationControls.appendChild(createPageBtn(totalPages, totalPages, false, false, `Go to page ${totalPages}`));
  }
  
  // Next & Last
  if (currentPage < totalPages) {
    paginationControls.appendChild(createPageBtn("Next ›", currentPage + 1, false, false, "Go to next page"));
    paginationControls.appendChild(createPageBtn("Last »", totalPages, false, false, "Go to last page"));
  }

  pageIndicator.textContent = `Showing ${start + 1}-${Math.min(end, filteredData.length)} of ${filteredData.length} results (Page ${currentPage} of ${totalPages})`;
  document.getElementById("jumpPage").max = totalPages;

  // Update summary stats based on filtered data
  const highSeverityCount = filteredData.filter(d => d.severity === "High").length;
  const uniqueSources = new Set(filteredData.map(d => d.source)).size;
  updateStats(filteredData.length, highSeverityCount, uniqueSources);
}

/**
 * Creates a pagination button.
 * @param {String|Number} label - The button text.
 * @param {Number} page - The page number this button links to.
 * @param {Boolean} active - Whether this is the current page.
 * @param {Boolean} disabled - Whether the button is disabled.
 * @param {String} ariaLabel - ARIA label for the button.
 * @returns {HTMLButtonElement} The created button element.
 */
function createPageBtn(label, page, active = false, disabled = false, ariaLabel = "") {
  const btn = document.createElement("button");
  btn.className = `btn btn-sm ${active ? "btn-primary" : "btn-outline-primary"}`;
  btn.textContent = label;
  if (disabled) btn.disabled = true;
  if (ariaLabel) btn.setAttribute("aria-label", ariaLabel);
  btn.onclick = () => {
    currentPage = page;
    renderTablePage();
    document.getElementById("cti-table-body").focus(); // Focus back to table for screen readers
  };
  return btn;
}

/**
 * Saves current filter selections to localStorage.
 */
function saveFilters() {
  const severityFilter = document.getElementById("severityFilter");
  const sourceFilter = document.getElementById("sourceFilter");
  if (severityFilter) localStorage.setItem("selectedSeverity", severityFilter.value);
  if (sourceFilter) localStorage.setItem("selectedSource", sourceFilter.value);
}

/**
 * Updates the statistics cards with animated counts.
 * @param {Number} total - Total indicators count.
 * @param {Number} high - High severity indicators count.
 * @param {Number} sources - Unique sources count.
 */
function updateStats(total, high, sources) {
  const lastUpdatedEl = document.getElementById("lastUpdated");
  if (lastUpdatedEl) lastUpdatedEl.textContent = new Date().toLocaleTimeString();

  const options = { duration: 1.5, useEasing: true, startVal: parseInt(document.getElementById("totalCount").textContent) || 0 };
  
  const totalCountEl = document.getElementById("totalCount");
  if (totalCountEl) new CountUp(totalCountEl, total, options).start();
  
  const highCountEl = document.getElementById("highCount");
  if (highCountEl) new CountUp(highCountEl, high, {...options, startVal: parseInt(highCountEl.textContent) || 0}).start();
  
  const sourceCountEl = document.getElementById("sourceCount");
  if (sourceCountEl) new CountUp(sourceCountEl, sources, {...options, startVal: parseInt(sourceCountEl.textContent) || 0}).start();
}

/**
 * Toggles the theme between light and dark mode.
 */
function toggleTheme() {
  const isDark = document.getElementById("themeToggle").checked;
  localStorage.setItem("theme", isDark ? "dark" : "light");
  applyTheme();
  // Re-render charts with new theme colors
  if (allCTIData.length > 0) {
      updateCharts(allCTIData);
  }
}

/**
 * Applies the current theme (light/dark) to the page.
 */
function applyTheme() {
  const isDark = localStorage.getItem("theme") === "dark";
  const themeToggle = document.getElementById("themeToggle");
  const themeIcon = document.getElementById("themeIcon");

  if (themeToggle) themeToggle.checked = isDark;
  document.body.classList.toggle("dark-theme", isDark);
  
  if (themeIcon) {
    themeIcon.className = isDark ? "bi bi-moon-stars-fill" : "bi bi-sun-fill";
  }
}

/**
 * Jumps to a specific page number in the table.
 */
function jumpToPage() {
  const input = document.getElementById("jumpPage");
  if (!input) return;

  const totalPages = Math.ceil(allCTIData.filter(item =>
    item.indicator.toLowerCase().includes(
      (document.getElementById("searchInput")?.value || "").toLowerCase()
    )
  ).length / rowsPerPage);

  let page = parseInt(input.value);
  if (isNaN(page) || page < 1) page = 1;
  if (page > totalPages) page = totalPages;

  currentPage = page;
  renderTablePage();
  input.value = ""; // Clear input after jump
}

/**
 * Looks up an IP address using the VirusTotal backend endpoint.
 */
function lookupVTIp() {
  const ipInput = document.getElementById("vtIpInput");
  const resultBox = document.getElementById("vtResult");
  if (!ipInput || !resultBox) return;

  const ip = ipInput.value.trim();

  if (!ip) {
    resultBox.innerHTML = `<div class="alert alert-warning p-2 small"><i class="bi bi-exclamation-triangle me-1"></i>Please enter a valid IP address.</div>`;
    return;
  }

  resultBox.innerHTML = `<div class="text-muted p-2"><div class="spinner-border spinner-border-sm me-2" role="status"></div>Fetching details for ${ip}...</div>`;

  fetch(`https://cti-dashboard-9j95.onrender.com/vt-lookup?ip=${ip}`)
    .then(async res => {
      const data = await res.json();
      if (!res.ok) {
        resultBox.innerHTML = `<div class="alert alert-danger p-2 small"><i class="bi bi-x-octagon me-1"></i>${data.detail || data.error || "Error looking up IP."}</div>`;
        return;
      }

      let tagsHtml = "Not available";
      if (data.tags && data.tags.length > 0) {
          tagsHtml = data.tags.map(tag => `<span class="badge bg-secondary text-white me-1 mb-1">${tag}</span>`).join("");
      }

      resultBox.innerHTML = `
        <div class="p-2">
          <p class="mb-1"><strong>IP Address:</strong> ${ip}</p>
          <p class="mb-1"><strong>Malicious Detections:</strong> <span class="fw-bold ${data.malicious > 0 ? "text-danger" : "text-success"}">${data.malicious}</span></p>
          <p class="mb-1"><strong>Suspicious Detections:</strong> <span class="fw-bold ${data.suspicious > 0 ? "text-warning" : "text-success"}">${data.suspicious}</span></p>
          <p class="mb-1"><strong>Last Analysis:</strong> ${data.last_analysis !== "N/A" ? new Date(data.last_analysis).toLocaleString() : "N/A"}</p>
          <p class="mb-1"><strong>Tags:</strong> ${tagsHtml}</p>
          <div class="mt-2">
            <a href="https://www.virustotal.com/gui/ip-address/${ip}" target="_blank" class="btn btn-sm btn-outline-primary"><i class="bi bi-box-arrow-up-right me-1"></i>View Full Report on VirusTotal</a>
          </div>
        </div>
      `;
    })
    .catch(err => {
      console.error("VirusTotal lookup error:", err);
      resultBox.innerHTML = `<div class="alert alert-danger p-2 small"><i class="bi bi-ethernet me-1"></i>Failed to fetch data. The backend might be unavailable.</div>`;
    });
}

/**
 * Shows the indicator details modal.
 * @param {Object} entry - The CTI data entry object.
 */
function showIndicatorModal(entry) {
  const modalElement = document.getElementById("indicatorModal");
  if (!modalElement) return;
  const indicatorModal = bootstrap.Modal.getOrCreateInstance(modalElement);
  
  const jsonBox = document.getElementById("jsonView");
  const riskBar = document.getElementById("riskBar");
  const vtLink = document.getElementById("vtLink");
  const modalTitle = document.getElementById("indicatorModalLabel");

  if (modalTitle) modalTitle.innerHTML = `<i class="bi bi-info-circle-fill me-2"></i>Indicator: ${entry.indicator}`;
  if (jsonBox) jsonBox.textContent = JSON.stringify(entry, null, 2);

  if (riskBar) {
    riskBar.textContent = entry.severity;
    riskBar.className = "badge fs-6 ms-2 rounded-pill px-3 py-1"; // Reset and apply base classes
    if (entry.severity === "High") {
      riskBar.classList.add("bg-danger", "text-white");
    } else if (entry.severity === "Medium") {
      riskBar.classList.add("bg-warning", "text-dark");
    } else {
      riskBar.classList.add("bg-info", "text-dark");
    }
  }

  if (vtLink) {
    if (entry.source === "VirusTotal" && (entry.type === "IP" || entry.type === "Domain" || entry.type === "URL" || entry.type === "FileHash")) {
      let linkPath = "";
      if (entry.type === "IP") linkPath = `ip-address/${entry.indicator}`;
      else if (entry.type === "Domain") linkPath = `domain/${entry.indicator}`;
      else if (entry.type === "URL") linkPath = `url/${entry.indicator}`;
      else if (entry.type === "FileHash") linkPath = `file/${entry.indicator}`;
      
      if (linkPath) {
        vtLink.href = `https://www.virustotal.com/gui/${linkPath}`;
        vtLink.style.display = "inline-block";
      } else {
        vtLink.style.display = "none";
      }
    } else {
      vtLink.style.display = "none";
    }
  }
  indicatorModal.show();
}

/**
 * Copies the content of the JSON view to the clipboard.
 */
function copyToClipboard() {
  const jsonBox = document.getElementById("jsonView");
  if (!jsonBox) return;
  const text = jsonBox.textContent;
  navigator.clipboard.writeText(text).then(() => {
    showToast("Indicator details copied to clipboard!", "success");
  }).catch(err => {
    showToast("Failed to copy to clipboard.", "warning");
    console.error("Clipboard copy error:", err);
  });
}

/**
 * Shows a Bootstrap toast notification.
 * @param {String} message - The message to display.
 * @param {String} type - The type of toast (e.g., success, danger, warning).
 */
function showToast(message, type = "info") {
    const toastEl = document.getElementById("errorToast"); // Reusing the existing toast element
    if (!toastEl) return;

    const toastBody = document.getElementById("toastMessage");
    if (toastBody) toastBody.textContent = message;

    // Remove existing color classes and add new one
    toastEl.classList.remove("text-bg-danger", "text-bg-success", "text-bg-warning", "text-bg-info");
    toastEl.classList.add(`text-bg-${type}`);

    const toast = bootstrap.Toast.getOrCreateInstance(toastEl);
    toast.show();
}

// Event Listeners
document.addEventListener("DOMContentLoaded", () => {
  applyTheme(); // Apply theme on initial load
  loadData();   // Load initial data

  // Keyboard navigation for table pagination
  document.addEventListener("keydown", (e) => {
    if (!allCTIData.length || document.activeElement?.closest(".modal")) return; // Don't interfere with modal inputs

    const searchInput = document.getElementById("searchInput");
    const jumpPageInput = document.getElementById("jumpPage");
    if (document.activeElement === searchInput || document.activeElement === jumpPageInput) return; // Don't interfere if typing in search/jump

    const searchValue = searchInput ? searchInput.value.toLowerCase() : "";
    const filteredLength = allCTIData.filter(item =>
      item.indicator.toLowerCase().includes(searchValue)
    ).length;
    const totalPages = Math.ceil(filteredLength / rowsPerPage);

    if (e.key === "ArrowLeft" && currentPage > 1) {
      e.preventDefault();
      currentPage--;
      renderTablePage();
    } else if (e.key === "ArrowRight" && currentPage < totalPages) {
      e.preventDefault();
      currentPage++;
      renderTablePage();
    }
  });
});