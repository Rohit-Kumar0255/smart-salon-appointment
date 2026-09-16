// ============================================
// DATA LAYER
// Pehle ye fetch() se backend API ko call karta tha.
// Ab sara data localStorage mein store hota hai (js/localdb.js dekhein),
// isliye koi bhi server chalane ki zaroorat nahi hai.
// ============================================

// ============================================
// STATE
// ============================================
let allServices = [];
let allStylists = [];
let currentCategory = "All";

const booking = {
  service: null,
  stylist: null,
  date: null,
  time: null,
};

// ============================================
// HELPERS
// ============================================
function showToast(message, type = "") {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.className = "toast show " + type;
  setTimeout(() => {
    toast.className = "toast " + type;
  }, 3200);
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
  return d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
}

function initials(name) {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

// ============================================
// LOAD SERVICES
// ============================================
async function loadServices() {
  try {
    allServices = await LocalAPI.getServices();
    document.getElementById("statServices").textContent = allServices.length;
    renderServiceGrid();
    renderBookingServiceGrid();
  } catch (err) {
    document.getElementById("serviceGrid").innerHTML = `<p class="empty-note">Services load nahi ho payi. Kya backend server chal raha hai?</p>`;
    console.error(err);
  }
}

function renderServiceGrid() {
  const grid = document.getElementById("serviceGrid");
  const filtered = currentCategory === "All" ? allServices : allServices.filter((s) => s.category === currentCategory);

  if (filtered.length === 0) {
    grid.innerHTML = `<p class="empty-note">Is category mein abhi koi service nahi hai.</p>`;
    return;
  }

  grid.innerHTML = filtered
    .map(
      (s) => `
    <div class="service-card">
      <span class="cat-tag">${s.category}</span>
      <h4>${s.name}</h4>
      <p>${s.description || ""}</p>
      <div class="service-meta">
        <span class="price">${formatMoney(s.price)}</span>
        <span class="duration">${s.durationMinutes} mins</span>
      </div>
    </div>`
    )
    .join("");
}

document.getElementById("categoryTabs").addEventListener("click", (e) => {
  if (!e.target.classList.contains("tab-btn")) return;
  document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
  e.target.classList.add("active");
  currentCategory = e.target.dataset.cat;
  renderServiceGrid();
});

// ============================================
// LOAD STYLISTS
// ============================================
async function loadStylists() {
  try {
    allStylists = await LocalAPI.getStylists();
    document.getElementById("statStylists").textContent = allStylists.length;
    renderStylistGrid();
    renderBookingStylistGrid();
  } catch (err) {
    document.getElementById("stylistGrid").innerHTML = `<p class="empty-note">Stylists load nahi ho paye. Kya backend server chal raha hai?</p>`;
    console.error(err);
  }
}

function renderStylistGrid() {
  const grid = document.getElementById("stylistGrid");
  if (allStylists.length === 0) {
    grid.innerHTML = `<p class="empty-note">Abhi koi stylist listed nahi hai.</p>`;
    return;
  }
  grid.innerHTML = allStylists
    .map(
      (s) => `
    <div class="stylist-card">
      <div class="avatar-ring">${initials(s.name)}</div>
      <h4>${s.name}</h4>
      <div class="specialty">${s.specialty}</div>
      <div class="exp">${s.experienceYears}+ years experience</div>
    </div>`
    )
    .join("");
}

// ============================================
// BOOKING FLOW — STEP 1: SERVICE
// ============================================
function renderBookingServiceGrid() {
  const grid = document.getElementById("bookServiceGrid");
  grid.innerHTML = allServices
    .map(
      (s) => `
    <div class="pick-card" data-id="${s._id}">
      <div>
        <div class="name">${s.name}</div>
        <div class="sub">${s.category} · ${s.durationMinutes} mins</div>
      </div>
      <div class="price">${formatMoney(s.price)}</div>
    </div>`
    )
    .join("");

  grid.querySelectorAll(".pick-card").forEach((card) => {
    card.addEventListener("click", () => {
      grid.querySelectorAll(".pick-card").forEach((c) => c.classList.remove("selected"));
      card.classList.add("selected");
      booking.service = allServices.find((s) => s._id === card.dataset.id);
      document.getElementById("toStep2").disabled = false;
    });
  });
}

// ============================================
// BOOKING FLOW — STEP 2: STYLIST
// ============================================
function renderBookingStylistGrid() {
  const grid = document.getElementById("bookStylistGrid");
  grid.innerHTML = allStylists
    .map(
      (s) => `
    <div class="pick-card" data-id="${s._id}">
      <div>
        <div class="name">${s.name}</div>
        <div class="sub">${s.specialty}</div>
      </div>
      <div class="price">${s.experienceYears}y exp</div>
    </div>`
    )
    .join("");

  grid.querySelectorAll(".pick-card").forEach((card) => {
    card.addEventListener("click", () => {
      grid.querySelectorAll(".pick-card").forEach((c) => c.classList.remove("selected"));
      card.classList.add("selected");
      booking.stylist = allStylists.find((s) => s._id === card.dataset.id);
      document.getElementById("toStep3").disabled = false;
    });
  });
}

// ============================================
// BOOKING FLOW — STEP 3: DATE & TIME
// ============================================
const dateInput = document.getElementById("bookDate");
const todayStr = new Date().toISOString().slice(0, 10);
dateInput.min = todayStr;

dateInput.addEventListener("change", async () => {
  booking.date = dateInput.value;
  booking.time = null;
  document.getElementById("toStep4").disabled = true;
  await loadAvailability();
});

async function loadAvailability() {
  const slotGrid = document.getElementById("slotGrid");
  if (!booking.service || !booking.stylist || !booking.date) return;

  slotGrid.innerHTML = `<p class="empty-note" style="grid-column:1/-1;padding:20px 0;">Checking availability…</p>`;

  try {
    const data = await LocalAPI.getAvailability({
      stylistId: booking.stylist._id,
      serviceId: booking.service._id,
      date: booking.date,
    });

    if (!data.slots || data.slots.length === 0) {
      slotGrid.innerHTML = `<p class="empty-note" style="grid-column:1/-1;padding:20px 0;">${data.message || "Is din koi slot available nahi hai."}</p>`;
      return;
    }

    slotGrid.innerHTML = data.slots
      .map(
        (s) => `<button type="button" class="slot-btn" data-time="${s.time}" ${s.available ? "" : "disabled"}>${formatTime12h(s.time)}</button>`
      )
      .join("");

    slotGrid.querySelectorAll(".slot-btn:not(:disabled)").forEach((btn) => {
      btn.addEventListener("click", () => {
        slotGrid.querySelectorAll(".slot-btn").forEach((b) => b.classList.remove("selected"));
        btn.classList.add("selected");
        booking.time = btn.dataset.time;
        document.getElementById("toStep4").disabled = false;
      });
    });
  } catch (err) {
    slotGrid.innerHTML = `<p class="empty-note" style="grid-column:1/-1;padding:20px 0;">Availability load nahi ho payi.</p>`;
    console.error(err);
  }
}

// ============================================
// STEPPER NAVIGATION
// ============================================
function goToStep(step) {
  document.querySelectorAll(".step").forEach((s) => {
    s.classList.remove("active", "done");
    if (String(s.dataset.step) === String(step)) s.classList.add("active");
    else if (Number(s.dataset.step) < Number(step)) s.classList.add("done");
  });
  document.querySelectorAll(".step-panel").forEach((p) => {
    p.classList.toggle("active", String(p.dataset.panel) === String(step));
  });
}

document.getElementById("toStep2").addEventListener("click", () => goToStep(2));
document.getElementById("toStep3").addEventListener("click", () => goToStep(3));
document.getElementById("toStep4").addEventListener("click", () => {
  renderBookingSummary();
  goToStep(4);
});
document.querySelectorAll("[data-back]").forEach((btn) => {
  btn.addEventListener("click", () => goToStep(btn.dataset.back));
});

function renderBookingSummary() {
  document.getElementById("bookingSummary").innerHTML = `
    <div class="ticket-row"><span>Service</span><span>${booking.service.name}</span></div>
    <div class="ticket-row"><span>Stylist</span><span>${booking.stylist.name}</span></div>
    <div class="ticket-row"><span>Date</span><span>${formatDatePretty(booking.date)}</span></div>
    <div class="ticket-row"><span>Time</span><span>${formatTime12h(booking.time)}</span></div>
    <div class="ticket-row"><span>Amount</span><span>${formatMoney(booking.service.price)}</span></div>
  `;
}

// ============================================
// STEP 4: SUBMIT BOOKING
// ============================================
document.getElementById("bookingForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const submitBtn = e.target.querySelector('button[type="submit"]');
  submitBtn.disabled = true;
  submitBtn.textContent = "Booking…";

  try {
    const payload = {
      customerName: document.getElementById("custName").value.trim(),
      customerPhone: document.getElementById("custPhone").value.trim(),
      customerEmail: document.getElementById("custEmail").value.trim(),
      notes: document.getElementById("custNotes").value.trim(),
      service: booking.service._id,
      stylist: booking.stylist._id,
      date: booking.date,
      timeSlot: booking.time,
    };

    const appt = await LocalAPI.createAppointment(payload);

    document.getElementById("confirmId").textContent = "#" + appt._id.slice(-8).toUpperCase();
    document.getElementById("confirmSummary").innerHTML = `
      <div class="ticket-row"><span>Service</span><span>${appt.service.name}</span></div>
      <div class="ticket-row"><span>Stylist</span><span>${appt.stylist.name}</span></div>
      <div class="ticket-row"><span>Date</span><span>${formatDatePretty(appt.date)}</span></div>
      <div class="ticket-row"><span>Time</span><span>${formatTime12h(appt.timeSlot)}</span></div>
      <div class="ticket-row"><span>Status</span><span class="ticket-status status-pending">Pending confirmation</span></div>
    `;
    goToStep("confirm");
    showToast("Appointment booked! 🎉", "success");
  } catch (err) {
    showToast(err.message, "error");
    // Agar slot clash ho gaya to fresh availability dobara load karo
    if (err.message.toLowerCase().includes("slot")) {
      loadAvailability();
    }
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Confirm booking";
  }
});

document.getElementById("bookAnother").addEventListener("click", () => {
  booking.service = null;
  booking.stylist = null;
  booking.date = null;
  booking.time = null;
  document.getElementById("bookingForm").reset();
  document.querySelectorAll(".pick-card").forEach((c) => c.classList.remove("selected"));
  document.getElementById("toStep2").disabled = true;
  document.getElementById("toStep3").disabled = true;
  document.getElementById("toStep4").disabled = true;
  dateInput.value = "";
  document.getElementById("slotGrid").innerHTML = `<p class="empty-note" style="grid-column:1/-1;padding:20px 0;">Select a date to see open slots</p>`;
  goToStep(1);
  document.getElementById("book").scrollIntoView({ behavior: "smooth" });
});

// ============================================
// MY APPOINTMENTS — LOOKUP
// ============================================
document.getElementById("lookupForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const phone = document.getElementById("lookupPhone").value.trim();
  const list = document.getElementById("apptList");
  list.innerHTML = `<p class="empty-note">Searching…</p>`;

  try {
    const appts = await LocalAPI.lookupAppointments(phone);
    if (appts.length === 0) {
      list.innerHTML = `<p class="empty-note">Is number se koi appointment nahi mila.</p>`;
      return;
    }
    renderAppointmentList(appts, phone);
  } catch (err) {
    list.innerHTML = `<p class="empty-note">Kuch galat ho gaya. Dobara try karein.</p>`;
    console.error(err);
  }
});

function renderAppointmentList(appts, phone) {
  const list = document.getElementById("apptList");
  list.innerHTML = appts
    .map(
      (a) => `
    <div class="appt-card" data-id="${a._id}">
      <div class="appt-info">
        <h4>${a.service ? a.service.name : "Service deleted"} <span class="ticket-status status-${a.status}">${a.status}</span></h4>
        <div class="meta">${formatDatePretty(a.date)} · ${formatTime12h(a.timeSlot)} · with ${a.stylist ? a.stylist.name : "N/A"}</div>
      </div>
      <div class="appt-actions">
        ${
          a.status === "pending" || a.status === "confirmed"
            ? `<button class="btn btn-ghost btn-sm" data-cancel="${a._id}">Cancel</button>`
            : ""
        }
      </div>
    </div>`
    )
    .join("");

  list.querySelectorAll("[data-cancel]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      if (!confirm("Kya aap ye appointment cancel karna chahte hain?")) return;
      try {
        await LocalAPI.cancelAppointment(btn.dataset.cancel, phone);
        showToast("Appointment cancel ho gaya", "success");
        const appts = await LocalAPI.lookupAppointments(phone);
        renderAppointmentList(appts, phone);
      } catch (err) {
        showToast(err.message, "error");
      }
    });
  });
}

// ============================================
// MISC UI
// ============================================
document.getElementById("year").textContent = new Date().getFullYear();

document.getElementById("navToggle").addEventListener("click", () => {
  const links = document.getElementById("navLinks");
  links.style.display = links.style.display === "flex" ? "none" : "flex";
});

// Scroll reveal animation
const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("in-view");
        revealObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.12 }
);
document.querySelectorAll(".reveal").forEach((el) => revealObserver.observe(el));

// ============================================
// INIT
// ============================================
loadServices();
loadStylists();
