# Smart Salon Appointment — Frontend Only (localStorage version)

Ye original **Smart Salon Appointment** project ka frontend-only version hai.
Ab koi Node/Express backend ya MongoDB database nahi chahiye — poora data
browser ke **localStorage** mein store hota hai.

## Kaise chalayein

Koi build step ya `npm install` nahi chahiye. Bas:

1. `index.html` ko seedhe browser mein open kar dein (double-click karke),
   ya VS Code ke "Live Server" extension se open karein.
2. Admin dashboard ke liye `admin.html` open karein.

> Tip: kuch browsers `file://` se local storage/relative paths thoda strict
> handle karte hain. Agar kuch load na ho to VS Code ka "Live Server" (ya
> `npx serve .`) use karke `http://localhost` par open karein.

## Admin login (default)

```
Email:    admin@smartsalon.com
Password: Admin@123
```

Ye credentials `js/localdb.js` mein pehli baar load hone par set ho jaate
hain (localStorage key: `salon_admin_account`).

## Data kahan store hota hai

`js/localdb.js` file poore backend (Express routes + MongoDB) ka kaam karti
hai — same booking rules, availability logic, aur admin CRUD, bas sab kuch
browser ke localStorage mein:

| localStorage key         | Kya store hota hai                     |
|---------------------------|-----------------------------------------|
| `salon_services`          | Sabhi services (haircut, facial, etc.) |
| `salon_stylists`          | Sabhi stylists aur unke working hours  |
| `salon_appointments`      | Sabhi bookings                         |
| `salon_admin_account`     | Admin ka email/password                |

Pehli baar load hone par ye automatically demo data (9 services, 4 stylists)
se seed ho jaata hai — bilkul waise hi jaise pehle backend ka `seed.js` karta
tha.

**Note:** Data sirf isi browser/device par save hota hai. Doosre browser ya
device par khola to alag/fresh data dikhega. Data reset karna ho to browser
DevTools → Application → Local Storage se in keys ko delete kar dein.

## Kya badla hai (backend se frontend-only mein)

- `backend/` folder poora hata diya gaya hai — ab iski zaroorat nahi.
- `js/localdb.js` (naya file) — pehle jo kaam Express API + MongoDB karte
  the (services/stylists CRUD, availability calculation, double-booking
  check, admin login, appointment lookup/cancel), wahi sab ab isi file mein
  localStorage ke through hota hai.
- `js/main.js` aur `js/admin.js` mein sirf `fetch()` calls ko `LocalAPI.*`
  calls se replace kiya gaya hai — baaki poora UI, design aur flow bilkul
  same hai.
