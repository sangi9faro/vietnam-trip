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

// Hotels. `task` = the group checklist item that books it (booked once that task is ticked); no task = already booked.
// `day` = trip day of check-in (D1 = 12/29). {m3} etc. are replaced with member names on screen.
window.TRIP_HOTELS = [
  { when: "12/29（1 晚）", day: 1, name: "M Village 快捷酒店 南圻起义街（Express by M Village Nam Ky Khoi Nghia）", q: "Express by M Village Nam Ky Khoi Nghia", addr: "214 Nam Ky Khoi Nghia, Vo Thi Sau, 第三郡", task: "hcmc",
    note: "工作室房，1.6 米大床，有厨房。注意：还没订（只收藏了）；页面上是 2 人，{m3}、{m4} 12/30 早上也会来，订的时候按实际人数登记。北京时间 12/24 15:00 前可免费取消。" },
  { when: "12/31（1 晚）", day: 3, name: "芽庄凯悦 Hyatt Regency Nha Trang", q: "Hyatt Regency Nha Trang" },
  { when: "1/1 – 1/3（2 晚）", day: 4, name: "金兰湾 Fusion Resort Cam Ranh", q: "Fusion Resort Cam Ranh" },
];
// 集体要办的 (toolbox checklist/group). Order = priority for the guide's 下一步 card.
window.TRIP_GROUP = [
  ["bus1231", "12/31 胡志明 → 芽庄大巴票（03:30 后）"], ["cxr0103", "1/3 金兰 → 胡志明机票（17:00 前到）"],
  ["island", "1/1 跳岛游预订（问清停航怎么退）"], ["hcmc", "12/29 胡志明 M Village：预订（按 3 人登记）、问夜里取行李"],
  ["hyatt", "芽庄凯悦：房间怎么分"], ["fusion", "Fusion：房间怎么分"],
];
// Transport between cities; `task` = the group item that books it.
window.TRIP_TRANSPORT = [
  { task: "bus1231", icon: "bus", title: "胡志明 → 芽庄 卧铺大巴", when: "12/31 03:30 以后最早的一班", day: 3, note: "跨年当天票紧张，提前买；确认上车点。" },
  { task: "cxr0103", icon: "plane", title: "金兰 → 胡志明 国内航班", when: "1/3 17:00 前到达", day: 6, note: "Fusion 到金兰机场十几分钟，中午退房后出发。" },
];
