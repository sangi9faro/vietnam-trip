// Shared trip data for guide.html and index.html. No real names here: people are m1–m4,
// display names come from Firestore meta/settings (defaults: 成员A–D).
// Times are ISO with the local UTC offset of each airport; durations are computed, never hand-written.
// status: ticketed 已出票 / pending 待出票 / tbd 待补充. Unknown fields are null.
window.TRIP_FLIGHTS = [
  // ---- inbound ----
  { who: "m1", dir: "in", airline: null, no: null,
    from: { code: "TPE", city: "台北", term: null }, to: { code: "SGN", city: "胡志明", term: null },
    dep: null, arr: null, approx: "2026-12-29T20:00+07:00", approxLabel: "12/29 晚", status: "tbd" },
  { who: "m3", dir: "in", airline: "越捷航空", no: "VJ5011",
    from: { code: "PVG", city: "上海浦东", term: "T2" }, to: { code: "SGN", city: "胡志明", term: "T2" },
    dep: "2026-12-30T02:15+08:00", arr: "2026-12-30T05:40+07:00", status: "ticketed" },
  { who: "m4", dir: "in", airline: "越旅行航空", no: null,
    from: { code: "SZX", city: "深圳宝安", term: "T3" }, to: { code: "SGN", city: "胡志明", term: "T2" },
    dep: "2026-12-30T05:00+08:00", arr: "2026-12-30T06:50+07:00", status: "ticketed" },
  { who: "m2", dir: "in", airline: "南方航空", no: "CZ6089",
    from: { code: "CAN", city: "广州白云", term: "T2" }, to: { code: "SGN", city: "胡志明", term: "T2" },
    dep: "2026-12-30T23:30+08:00", arr: "2026-12-31T01:20+07:00", status: "ticketed" },
  // ---- outbound ----
  { who: "m3", dir: "out", airline: "富国太阳航空", no: "9G634",
    from: { code: "SGN", city: "胡志明", term: "T2" }, to: { code: "PVG", city: "上海浦东", term: null },
    dep: "2027-01-03T21:45+07:00", arr: "2027-01-04T02:45+08:00", status: "ticketed" },
  { who: "m4", dir: "out", airline: "越旅行航空", no: null,
    from: { code: "SGN", city: "胡志明", term: null }, to: { code: "SZX", city: "深圳宝安", term: null },
    dep: "2027-01-04T00:10+07:00", arr: "2027-01-04T04:00+08:00", status: "ticketed" },
  { who: "m2", dir: "out", airline: "南方航空", no: "CZ6090",
    from: { code: "SGN", city: "胡志明", term: "T2" }, to: { code: "CAN", city: "广州白云", term: "T2" },
    dep: "2027-01-04T02:25+07:00", arr: "2027-01-04T06:20+08:00", status: "ticketed" },
  { who: "m1", dir: "out", airline: null, no: null,
    from: { code: "SGN", city: "胡志明", term: null }, to: { code: "ICN", city: "首尔", term: null },
    dep: null, arr: null, approx: "2027-01-03T20:00+07:00", approxLabel: "1/3", status: "tbd" },
];
