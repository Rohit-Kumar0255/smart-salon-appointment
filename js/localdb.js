// ============================================
// LOCAL DATABASE (localStorage)
// Ye file backend + MongoDB ka kaam karti hai, sab kuch
// browser ke localStorage mein store hota hai. Isliye poora
// project ab bina kisi server ke, sirf frontend se chal sakta hai.
//
// Data yahin browser mein rehta hai (isi device/browser par),
// jab tak aap localStorage clear na karein.
// ============================================

const LS_KEYS = {
  services: "salon_services",
  stylists: "salon_stylists",
  appointments: "salon_appointments",
  admin: "salon_admin_account",
};

// ---------- small helpers ----------
function uid() {
  // MongoDB ObjectId jaisa dikhne wala 24-char hex id
  return Array.from({ length: 24 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
}

function readLS(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeLS(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function timeToMinutes(t) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function minutesToTime(mins) {
  const h = Math.floor(mins / 60).toString().padStart(2, "0");
  const m = (mins % 60).toString().padStart(2, "0");
  return `${h}:${m}`;
}

// Halka sa simulated delay, taaki loading states (jo already UI mein hain) natural lagein
function delay(ms = 200) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ============================================
// SEED DATA — pehli baar (ya localStorage clear hone ke baad) load hoti hai
// ============================================
function seedIfEmpty() {
  if (!localStorage.getItem(LS_KEYS.services)) {
    const services = [
      { name: "Haircut & Styling", category: "Hair", price: 399, durationMinutes: 45, description: "Wash, cut aur blow-dry styling" },
      { name: "Hair Spa", category: "Hair", price: 899, durationMinutes: 60, description: "Deep conditioning aur nourishing hair spa" },
      { name: "Global Hair Color", category: "Hair", price: 1999, durationMinutes: 90, description: "Full hair coloring, ammonia-free" },
      { name: "Classic Facial", category: "Skin", price: 699, durationMinutes: 45, description: "Cleansing, exfoliation aur glow facial" },
      { name: "Gold Facial", category: "Skin", price: 1499, durationMinutes: 60, description: "Premium 24k gold radiance facial" },
      { name: "Manicure", category: "Nails", price: 349, durationMinutes: 30, description: "Nail shaping, cuticle care aur polish" },
      { name: "Pedicure", category: "Nails", price: 449, durationMinutes: 40, description: "Foot spa, scrub aur polish" },
      { name: "Bridal Makeup", category: "Makeup", price: 4999, durationMinutes: 120, description: "HD bridal makeup with trial" },
      { name: "Full Body Massage", category: "Spa", price: 1299, durationMinutes: 60, description: "Relaxing aromatherapy body massage" },
    ].map((s) => ({ _id: uid(), isActive: true, createdAt: new Date().toISOString(), ...s }));
    writeLS(LS_KEYS.services, services);
  }

  if (!localStorage.getItem(LS_KEYS.stylists)) {
    const stylists = [
      { name: "Priya Sharma", specialty: "Senior Hair Stylist", experienceYears: 8, workStart: "10:00", workEnd: "19:00", weeklyOff: [1] },
      { name: "Rahul Verma", specialty: "Color Expert", experienceYears: 6, workStart: "10:00", workEnd: "19:00", weeklyOff: [2] },
      { name: "Ananya Singh", specialty: "Skin & Facial Specialist", experienceYears: 5, workStart: "11:00", workEnd: "20:00", weeklyOff: [1] },
      { name: "Karan Mehta", specialty: "Makeup Artist", experienceYears: 7, workStart: "10:00", workEnd: "18:00", weeklyOff: [3] },
    ].map((s) => ({ _id: uid(), bio: "", isActive: true, ...s }));
    writeLS(LS_KEYS.stylists, stylists);
  }

  if (!localStorage.getItem(LS_KEYS.appointments)) {
    writeLS(LS_KEYS.appointments, []);
  }

  if (!localStorage.getItem(LS_KEYS.admin)) {
    writeLS(LS_KEYS.admin, {
      email: "admin@smartsalon.com",
      password: "Admin@123",
      name: "Salon Admin",
    });
  }
}
seedIfEmpty();

// Appointment ke andar service/stylist ki poori detail bhar deta hai (backend ke .populate() jaisa)
function populateAppointment(appt) {
  const services = readLS(LS_KEYS.services, []);
  const stylists = readLS(LS_KEYS.stylists, []);
  const service = services.find((s) => s._id === appt.service);
  const stylist = stylists.find((s) => s._id === appt.stylist);
  return {
    ...appt,
    service: service ? { _id: service._id, name: service.name, price: service.price, durationMinutes: service.durationMinutes } : null,
    stylist: stylist ? { _id: stylist._id, name: stylist.name, specialty: stylist.specialty } : null,
  };
}

// ============================================
// PUBLIC API — window.LocalAPI
// (fetch() calls isi se replace hue hain, function names/behaviour backend jaisa hi hai)
// ============================================
const LocalAPI = {
  // ---------- SERVICES ----------
  async getServices(all = false) {
    await delay();
    const services = readLS(LS_KEYS.services, []).sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));
    return all ? services : services.filter((s) => s.isActive);
  },

  async createService(data) {
    await delay();
    if (!data.name || data.price == null || data.durationMinutes == null) {
      throw new Error("Service create nahi ho paaya");
    }
    const services = readLS(LS_KEYS.services, []);
    const service = {
      _id: uid(),
      category: "Other",
      description: "",
      isActive: true,
      createdAt: new Date().toISOString(),
      ...data,
    };
    services.push(service);
    writeLS(LS_KEYS.services, services);
    return service;
  },

  async updateService(id, data) {
    await delay();
    const services = readLS(LS_KEYS.services, []);
    const idx = services.findIndex((s) => s._id === id);
    if (idx === -1) throw new Error("Service nahi mila");
    services[idx] = { ...services[idx], ...data };
    writeLS(LS_KEYS.services, services);
    return services[idx];
  },

  async deleteService(id) {
    await delay();
    const services = readLS(LS_KEYS.services, []);
    if (!services.some((s) => s._id === id)) throw new Error("Service nahi mila");
    writeLS(LS_KEYS.services, services.filter((s) => s._id !== id));
    return { message: "Service delete ho gaya" };
  },

  // ---------- STYLISTS ----------
  async getStylists(all = false) {
    await delay();
    const stylists = readLS(LS_KEYS.stylists, []).sort((a, b) => a.name.localeCompare(b.name));
    return all ? stylists : stylists.filter((s) => s.isActive);
  },

  async createStylist(data) {
    await delay();
    if (!data.name) throw new Error("Stylist create nahi ho paaya");
    const stylists = readLS(LS_KEYS.stylists, []);
    const stylist = {
      _id: uid(),
      specialty: "Hair Stylist",
      experienceYears: 0,
      bio: "",
      workStart: "10:00",
      workEnd: "19:00",
      weeklyOff: [],
      isActive: true,
      ...data,
    };
    stylists.push(stylist);
    writeLS(LS_KEYS.stylists, stylists);
    return stylist;
  },

  async updateStylist(id, data) {
    await delay();
    const stylists = readLS(LS_KEYS.stylists, []);
    const idx = stylists.findIndex((s) => s._id === id);
    if (idx === -1) throw new Error("Stylist nahi mila");
    stylists[idx] = { ...stylists[idx], ...data };
    writeLS(LS_KEYS.stylists, stylists);
    return stylists[idx];
  },

  async deleteStylist(id) {
    await delay();
    const stylists = readLS(LS_KEYS.stylists, []);
    if (!stylists.some((s) => s._id === id)) throw new Error("Stylist nahi mila");
    writeLS(LS_KEYS.stylists, stylists.filter((s) => s._id !== id));
    return { message: "Stylist delete ho gaya" };
  },

  // ---------- AVAILABILITY ----------
  async getAvailability({ stylistId, serviceId, date }) {
    await delay();
    if (!stylistId || !serviceId || !date) throw new Error("stylistId, serviceId aur date zaroori hain");

    const stylist = readLS(LS_KEYS.stylists, []).find((s) => s._id === stylistId);
    const service = readLS(LS_KEYS.services, []).find((s) => s._id === serviceId);
    if (!stylist || !service) throw new Error("Stylist ya service nahi mila");

    const dayOfWeek = new Date(date + "T00:00:00").getDay();
    if (stylist.weeklyOff.includes(dayOfWeek)) {
      return { slots: [], message: "Stylist is off on this day" };
    }

    const duration = service.durationMinutes;
    const stepMinutes = 30;
    const startMin = timeToMinutes(stylist.workStart);
    const endMin = timeToMinutes(stylist.workEnd);

    const services = readLS(LS_KEYS.services, []);
    const existing = readLS(LS_KEYS.appointments, []).filter(
      (a) => a.stylist === stylistId && a.date === date && a.status !== "cancelled"
    );
    const occupiedRanges = existing.map((appt) => {
      const s = timeToMinutes(appt.timeSlot);
      const svc = services.find((sv) => sv._id === appt.service);
      const d = svc ? svc.durationMinutes : 30;
      return [s, s + d];
    });

    const now = new Date();
    const isToday = date === now.toISOString().slice(0, 10);
    const nowMinutes = now.getHours() * 60 + now.getMinutes();

    const slots = [];
    for (let t = startMin; t + duration <= endMin; t += stepMinutes) {
      const slotEnd = t + duration;
      const overlaps = occupiedRanges.some(([s, e]) => t < e && slotEnd > s);
      const isPast = isToday && t <= nowMinutes;
      slots.push({ time: minutesToTime(t), available: !overlaps && !isPast });
    }
    return { slots };
  },

  // ---------- APPOINTMENTS (public) ----------
  async createAppointment(payload) {
    await delay();
    const { customerName, customerPhone, customerEmail, service, stylist, date, timeSlot, notes } = payload;
    if (!customerName || !customerPhone || !service || !stylist || !date || !timeSlot) {
      throw new Error("Sabhi required fields bharein");
    }

    const serviceDoc = readLS(LS_KEYS.services, []).find((s) => s._id === service);
    if (!serviceDoc) throw new Error("Service nahi mila");

    const duration = serviceDoc.durationMinutes;
    const newStart = timeToMinutes(timeSlot);
    const newEnd = newStart + duration;

    const services = readLS(LS_KEYS.services, []);
    const appointments = readLS(LS_KEYS.appointments, []);
    const existing = appointments.filter((a) => a.stylist === stylist && a.date === date && a.status !== "cancelled");
    const clash = existing.some((appt) => {
      const s = timeToMinutes(appt.timeSlot);
      const svc = services.find((sv) => sv._id === appt.service);
      const d = svc ? svc.durationMinutes : 30;
      return newStart < s + d && newEnd > s;
    });
    if (clash) throw new Error("Ye slot abhi-abhi book ho gaya. Kripya doosra slot chunein.");

    const appointment = {
      _id: uid(),
      customerName,
      customerPhone,
      customerEmail: customerEmail || "",
      service,
      stylist,
      date,
      timeSlot,
      notes: notes || "",
      status: "pending",
      createdAt: new Date().toISOString(),
    };
    appointments.push(appointment);
    writeLS(LS_KEYS.appointments, appointments);
    return populateAppointment(appointment);
  },

  async lookupAppointments(phone) {
    await delay();
    const appointments = readLS(LS_KEYS.appointments, [])
      .filter((a) => a.customerPhone === phone)
      .sort((a, b) => (b.date + b.timeSlot).localeCompare(a.date + a.timeSlot));
    return appointments.map(populateAppointment);
  },

  async cancelAppointment(id, phone) {
    await delay();
    const appointments = readLS(LS_KEYS.appointments, []);
    const idx = appointments.findIndex((a) => a._id === id);
    if (idx === -1) throw new Error("Appointment nahi mila");
    if (phone && appointments[idx].customerPhone !== phone) throw new Error("Phone number match nahi hua");
    appointments[idx].status = "cancelled";
    writeLS(LS_KEYS.appointments, appointments);
    return { message: "Appointment cancel ho gaya", appointment: appointments[idx] };
  },

  // ---------- APPOINTMENTS (admin) ----------
  async getAppointments({ date, status } = {}) {
    await delay();
    let appointments = readLS(LS_KEYS.appointments, []);
    if (date) appointments = appointments.filter((a) => a.date === date);
    if (status) appointments = appointments.filter((a) => a.status === status);
    appointments.sort((a, b) => (a.date + a.timeSlot).localeCompare(b.date + b.timeSlot));
    return appointments.map(populateAppointment);
  },

  async updateAppointmentStatus(id, status) {
    await delay();
    if (!["pending", "confirmed", "completed", "cancelled"].includes(status)) throw new Error("Invalid status");
    const appointments = readLS(LS_KEYS.appointments, []);
    const idx = appointments.findIndex((a) => a._id === id);
    if (idx === -1) throw new Error("Appointment nahi mila");
    appointments[idx].status = status;
    writeLS(LS_KEYS.appointments, appointments);
    return populateAppointment(appointments[idx]);
  },

  async deleteAppointment(id) {
    await delay();
    const appointments = readLS(LS_KEYS.appointments, []);
    if (!appointments.some((a) => a._id === id)) throw new Error("Appointment nahi mila");
    writeLS(LS_KEYS.appointments, appointments.filter((a) => a._id !== id));
    return { message: "Appointment delete ho gaya" };
  },

  // ---------- AUTH ----------
  async login(email, password) {
    await delay();
    const admin = readLS(LS_KEYS.admin, null);
    if (!admin || admin.email.toLowerCase() !== String(email).toLowerCase().trim() || admin.password !== password) {
      throw new Error("Invalid email or password");
    }
    return { token: "local-" + uid(), admin: { id: "local-admin", email: admin.email, name: admin.name } };
  },
};

window.LocalAPI = LocalAPI;
