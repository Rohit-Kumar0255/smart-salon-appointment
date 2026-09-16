// ============================================
// DATA LAYER
// Pehle ye fetch() se backend API (JWT auth ke saath) ko call karta tha.
// Ab sara data localStorage mein store hota hai (js/localdb.js dekhein),
// isliye koi bhi server chalane ki zaroorat nahi hai.
// ============================================

// ============================================
// STATE
// ============================================
let token = localStorage.getItem("salon_admin_token");
let allServices = [];
let allStylists = [];
let editingServiceId = null;
let editingStylistId = null;
let selectedWeeklyOff = [];

// ============================================
// HELPERS
// ============================================
function showToast(message, type = "") {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.className = "toast show " + type;
  setTimeout(() => (toast.className = "toast " + type), 3200);
}

function formatMoney(n) {
  return "₹" + Number(n).toLocaleString("en-IN");
}
function formatTime12h(t) {
  const [h, m] = t.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${m.toString().padStart(2, "0")} ${period}`;
}
function formatDatePretty(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}
const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// ============================================
// AUTH
// ============================================
function showDashboard() {
  document.getElementById("loginScreen").style.display = "none";
  document.getElementById("adminShell").classList.add("active");
  loadOverview();
}
function showLogin() {
  document.getElementById("loginScreen").style.display = "grid";
  document.getElementById("adminShell").classList.remove("active");
}
function logout() {
  localStorage.removeItem("salon_admin_token");
  localStorage.removeItem("salon_admin_info");
  token = null;
  showLogin();
}

document.getElementById("loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const errorBox = document.getElementById("loginError");
  errorBox.style.display = "none";

  const email = document.getElementById("loginEmail").value.trim();
  const password = document.getElementById("loginPassword").value;

  try {
    const data = await LocalAPI.login(email, password);

    token = data.token;
    localStorage.setItem("salon_admin_token", token);
    localStorage.setItem("salon_admin_info", JSON.stringify(data.admin));
    showDashboard();
  } catch (err) {
    errorBox.textContent = err.message;
    errorBox.style.display = "block";
  }
});

document.getElementById("logoutBtn").addEventListener("click", logout);

if (token) showDashboard();
else showLogin();

// ============================================
// NAV SWITCHING
// ============================================
document.getElementById("adminNav").addEventListener("click", (e) => {
  const btn = e.target.closest("button[data-view]");
  if (!btn) return;
  document.querySelectorAll(".admin-nav button").forEach((b) => b.classList.remove("active"));
  btn.classList.add("active");
  document.querySelectorAll(".admin-view").forEach((v) => v.classList.remove("active"));
  document.querySelector(`.admin-view[data-view="${btn.dataset.view}"]`).classList.add("active");

  if (btn.dataset.view === "overview") loadOverview();
  if (btn.dataset.view === "appointments") loadAppointments();
  if (btn.dataset.view === "services") loadServicesAdmin();
  if (btn.dataset.view === "stylists") loadStylistsAdmin();
});

// ============================================
// OVERVIEW
// ============================================
async function loadOverview() {
  try {
    const [appts, services, stylists] = await Promise.all([
      LocalAPI.getAppointments(),
      LocalAPI.getServices(true),
      LocalAPI.getStylists(true),
    ]);

    const todayStr = new Date().toISOString().slice(0, 10);
    const todayAppts = appts.filter((a) => a.date === todayStr && a.status !== "cancelled");
    const pending = appts.filter((a) => a.status === "pending");

    document.getElementById("statToday").textContent = todayAppts.length;
    document.getElementById("statPending").textContent = pending.length;
    document.getElementById("statTotalServices").textContent = services.filter((s) => s.isActive).length;
    document.getElementById("statTotalStylists").textContent = stylists.filter((s) => s.isActive).length;

    const wrap = document.getElementById("todayTableWrap");
    if (todayAppts.length === 0) {
      wrap.innerHTML = `<p class="empty-note">Aaj koi appointment schedule nahi hai.</p>`;
      return;
    }
    wrap.innerHTML = buildApptTable(todayAppts.sort((a, b) => a.timeSlot.localeCompare(b.timeSlot)));
    attachApptTableEvents(wrap);
  } catch (err) {
    showToast(err.message, "error");
  }
}

// ============================================
// APPOINTMENTS
// ============================================
async function loadAppointments() {
  const wrap = document.getElementById("apptTableWrap");
  wrap.innerHTML = `<p class="empty-note">Loading…</p>`;

  const date = document.getElementById("filterDate").value;
  const status = document.getElementById("filterStatus").value;

  try {
    const appts = await LocalAPI.getAppointments({ date, status });
    if (appts.length === 0) {
      wrap.innerHTML = `<p class="empty-note">Koi appointment nahi mila.</p>`;
      return;
    }
    wrap.innerHTML = buildApptTable(appts);
    attachApptTableEvents(wrap);
  } catch (err) {
    wrap.innerHTML = `<p class="empty-note">Load nahi ho paya.</p>`;
    showToast(err.message, "error");
  }
}

function buildApptTable(appts) {
  return `
  <table class="data-table">
    <thead>
      <tr><th>Customer</th><th>Service</th><th>Stylist</th><th>Date &amp; Time</th><th>Status</th><th></th></tr>
    </thead>
    <tbody>
      ${appts
        .map(
          (a) => `
        <tr>
          <td>${a.customerName}<br /><span class="muted">${a.customerPhone}</span></td>
          <td>${a.service ? a.service.name : "—"}<br /><span class="muted">${a.service ? formatMoney(a.service.price) : ""}</span></td>
          <td>${a.stylist ? a.stylist.name : "—"}</td>
          <td>${formatDatePretty(a.date)}<br /><span class="muted">${formatTime12h(a.timeSlot)}</span></td>
          <td>
            <select class="status-select status-${a.status}" data-id="${a._id}">
              <option value="pending" ${a.status === "pending" ? "selected" : ""}>Pending</option>
              <option value="confirmed" ${a.status === "confirmed" ? "selected" : ""}>Confirmed</option>
              <option value="completed" ${a.status === "completed" ? "selected" : ""}>Completed</option>
              <option value="cancelled" ${a.status === "cancelled" ? "selected" : ""}>Cancelled</option>
            </select>
          </td>
          <td><button class="icon-btn" data-delete="${a._id}">Delete</button></td>
        </tr>`
        )
        .join("")}
    </tbody>
  </table>`;
}

function attachApptTableEvents(wrap) {
  wrap.querySelectorAll(".status-select").forEach((sel) => {
    sel.addEventListener("change", async () => {
      const prevClass = sel.className;
      try {
        await LocalAPI.updateAppointmentStatus(sel.dataset.id, sel.value);
        sel.className = `status-select status-${sel.value}`;
        showToast("Status update ho gaya", "success");
      } catch (err) {
        sel.className = prevClass;
        showToast(err.message, "error");
      }
    });
  });

  wrap.querySelectorAll("[data-delete]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      if (!confirm("Ye appointment permanently delete karein?")) return;
      try {
        await LocalAPI.deleteAppointment(btn.dataset.delete);
        showToast("Appointment delete ho gaya", "success");
        btn.closest("tr").remove();
      } catch (err) {
        showToast(err.message, "error");
      }
    });
  });
}

document.getElementById("filterDate").addEventListener("change", loadAppointments);
document.getElementById("filterStatus").addEventListener("change", loadAppointments);
document.getElementById("clearFilters").addEventListener("click", () => {
  document.getElementById("filterDate").value = "";
  document.getElementById("filterStatus").value = "";
  loadAppointments();
});

// ============================================
// SERVICES (admin CRUD)
// ============================================
async function loadServicesAdmin() {
  const wrap = document.getElementById("serviceTableWrap");
  wrap.innerHTML = `<p class="empty-note">Loading…</p>`;
  try {
    allServices = await LocalAPI.getServices(true);
    if (allServices.length === 0) {
      wrap.innerHTML = `<p class="empty-note">Abhi koi service nahi hai. Form se add karein.</p>`;
      return;
    }
    wrap.innerHTML = `
    <table class="data-table">
      <thead><tr><th>Name</th><th>Category</th><th>Price</th><th>Duration</th><th>Status</th><th></th></tr></thead>
      <tbody>
        ${allServices
          .map(
            (s) => `
          <tr>
            <td>${s.name}</td>
            <td class="muted">${s.category}</td>
            <td>${formatMoney(s.price)}</td>
            <td class="muted">${s.durationMinutes} mins</td>
            <td class="muted">${s.isActive ? "Active" : "Hidden"}</td>
            <td style="white-space:nowrap;">
              <button class="icon-btn" data-edit="${s._id}">Edit</button>
              <button class="icon-btn" data-delete="${s._id}">Delete</button>
            </td>
          </tr>`
          )
          .join("")}
      </tbody>
    </table>`;

    wrap.querySelectorAll("[data-edit]").forEach((btn) =>
      btn.addEventListener("click", () => editService(btn.dataset.edit))
    );
    wrap.querySelectorAll("[data-delete]").forEach((btn) =>
      btn.addEventListener("click", () => deleteService(btn.dataset.delete))
    );
  } catch (err) {
    wrap.innerHTML = `<p class="empty-note">Load nahi ho paya.</p>`;
    showToast(err.message, "error");
  }
}

function editService(id) {
  const s = allServices.find((x) => x._id === id);
  if (!s) return;
  editingServiceId = id;
  document.getElementById("serviceFormTitle").textContent = "Edit service";
  document.getElementById("serviceId").value = id;
  document.getElementById("serviceName").value = s.name;
  document.getElementById("serviceCategory").value = s.category;
  document.getElementById("serviceDuration").value = s.durationMinutes;
  document.getElementById("servicePrice").value = s.price;
  document.getElementById("serviceDescription").value = s.description || "";
  document.getElementById("serviceActive").checked = s.isActive;
  document.getElementById("serviceCancelEdit").style.display = "inline-flex";
  document.querySelector('.panel h3#serviceFormTitle').scrollIntoView({ behavior: "smooth", block: "center" });
}

async function deleteService(id) {
  if (!confirm("Ye service delete karein?")) return;
  try {
    await LocalAPI.deleteService(id);
    showToast("Service delete ho gayi", "success");
    loadServicesAdmin();
  } catch (err) {
    showToast(err.message, "error");
  }
}

function resetServiceForm() {
  editingServiceId = null;
  document.getElementById("serviceForm").reset();
  document.getElementById("serviceId").value = "";
  document.getElementById("serviceFormTitle").textContent = "Add a service";
  document.getElementById("serviceCancelEdit").style.display = "none";
}
document.getElementById("serviceCancelEdit").addEventListener("click", resetServiceForm);

document.getElementById("serviceForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const payload = {
    name: document.getElementById("serviceName").value.trim(),
    category: document.getElementById("serviceCategory").value,
    durationMinutes: Number(document.getElementById("serviceDuration").value),
    price: Number(document.getElementById("servicePrice").value),
    description: document.getElementById("serviceDescription").value.trim(),
    isActive: document.getElementById("serviceActive").checked,
  };
  try {
    if (editingServiceId) {
      await LocalAPI.updateService(editingServiceId, payload);
      showToast("Service update ho gayi", "success");
    } else {
      await LocalAPI.createService(payload);
      showToast("Service add ho gayi", "success");
    }
    resetServiceForm();
    loadServicesAdmin();
  } catch (err) {
    showToast(err.message, "error");
  }
});

// ============================================
// STYLISTS (admin CRUD)
// ============================================
async function loadStylistsAdmin() {
  const wrap = document.getElementById("stylistTableWrap");
  wrap.innerHTML = `<p class="empty-note">Loading…</p>`;
  try {
    allStylists = await LocalAPI.getStylists(true);
    if (allStylists.length === 0) {
      wrap.innerHTML = `<p class="empty-note">Abhi koi stylist nahi hai. Form se add karein.</p>`;
      return;
    }
    wrap.innerHTML = `
    <table class="data-table">
      <thead><tr><th>Name</th><th>Specialty</th><th>Hours</th><th>Off day</th><th>Status</th><th></th></tr></thead>
      <tbody>
        ${allStylists
          .map(
            (s) => `
          <tr>
            <td>${s.name}</td>
            <td class="muted">${s.specialty}</td>
            <td class="muted">${formatTime12h(s.workStart)} – ${formatTime12h(s.workEnd)}</td>
            <td class="muted">${s.weeklyOff.map((d) => DAY_NAMES[d]).join(", ") || "None"}</td>
            <td class="muted">${s.isActive ? "Active" : "Hidden"}</td>
            <td style="white-space:nowrap;">
              <button class="icon-btn" data-edit="${s._id}">Edit</button>
              <button class="icon-btn" data-delete="${s._id}">Delete</button>
            </td>
          </tr>`
          )
          .join("")}
      </tbody>
    </table>`;

    wrap.querySelectorAll("[data-edit]").forEach((btn) =>
      btn.addEventListener("click", () => editStylist(btn.dataset.edit))
    );
    wrap.querySelectorAll("[data-delete]").forEach((btn) =>
      btn.addEventListener("click", () => deleteStylist(btn.dataset.delete))
    );
  } catch (err) {
    wrap.innerHTML = `<p class="empty-note">Load nahi ho paya.</p>`;
    showToast(err.message, "error");
  }
}

function setWeeklyOffChips(days) {
  selectedWeeklyOff = [...days];
  document.querySelectorAll(".day-chip").forEach((chip) => {
    chip.classList.toggle("selected", selectedWeeklyOff.includes(Number(chip.dataset.day)));
  });
}

document.getElementById("weeklyOffChips").addEventListener("click", (e) => {
  const chip = e.target.closest(".day-chip");
  if (!chip) return;
  const day = Number(chip.dataset.day);
  if (selectedWeeklyOff.includes(day)) {
    selectedWeeklyOff = selectedWeeklyOff.filter((d) => d !== day);
  } else {
    selectedWeeklyOff.push(day);
  }
  chip.classList.toggle("selected");
});

function editStylist(id) {
  const s = allStylists.find((x) => x._id === id);
  if (!s) return;
  editingStylistId = id;
  document.getElementById("stylistFormTitle").textContent = "Edit stylist";
  document.getElementById("stylistId").value = id;
  document.getElementById("stylistName").value = s.name;
  document.getElementById("stylistSpecialty").value = s.specialty;
  document.getElementById("stylistExperience").value = s.experienceYears;
  document.getElementById("stylistStart").value = s.workStart;
  document.getElementById("stylistEnd").value = s.workEnd;
  document.getElementById("stylistActive").checked = s.isActive;
  setWeeklyOffChips(s.weeklyOff || []);
  document.getElementById("stylistCancelEdit").style.display = "inline-flex";
  document.querySelector('.panel h3#stylistFormTitle').scrollIntoView({ behavior: "smooth", block: "center" });
}

async function deleteStylist(id) {
  if (!confirm("Ye stylist delete karein?")) return;
  try {
    await LocalAPI.deleteStylist(id);
    showToast("Stylist delete ho gaya", "success");
    loadStylistsAdmin();
  } catch (err) {
    showToast(err.message, "error");
  }
}

function resetStylistForm() {
  editingStylistId = null;
  document.getElementById("stylistForm").reset();
  document.getElementById("stylistId").value = "";
  document.getElementById("stylistStart").value = "10:00";
  document.getElementById("stylistEnd").value = "19:00";
  document.getElementById("stylistFormTitle").textContent = "Add a stylist";
  document.getElementById("stylistCancelEdit").style.display = "none";
  setWeeklyOffChips([]);
}
document.getElementById("stylistCancelEdit").addEventListener("click", resetStylistForm);

document.getElementById("stylistForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const payload = {
    name: document.getElementById("stylistName").value.trim(),
    specialty: document.getElementById("stylistSpecialty").value.trim() || "Hair Stylist",
    experienceYears: Number(document.getElementById("stylistExperience").value) || 0,
    workStart: document.getElementById("stylistStart").value,
    workEnd: document.getElementById("stylistEnd").value,
    weeklyOff: selectedWeeklyOff,
    isActive: document.getElementById("stylistActive").checked,
  };
  try {
    if (editingStylistId) {
      await LocalAPI.updateStylist(editingStylistId, payload);
      showToast("Stylist update ho gaya", "success");
    } else {
      await LocalAPI.createStylist(payload);
      showToast("Stylist add ho gaya", "success");
    }
    resetStylistForm();
    loadStylistsAdmin();
  } catch (err) {
    showToast(err.message, "error");
  }
});
