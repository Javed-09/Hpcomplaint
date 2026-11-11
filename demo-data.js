/* ============================================================================
   HUFF & PUFF BURGER — Complaint Management System
   demo-data.js  —  SEPARATE DEMO DATASET (clearly labelled, not real data)
   ----------------------------------------------------------------------------
   This file contains ONLY fictional demo complaints used to demonstrate the
   dashboard in Demo Mode. It is never loaded while the site is connected to
   the real Google Sheets database, so demo records can never mix with real
   company complaints.

   Dates are generated RELATIVE to "today" so the demo always looks current.
   ============================================================================ */

window.HPB_DEMO_DATA = (function () {

  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function dstr(d) { return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }

  /* datetime string N days ago at hh:mm (local time) */
  function dtAgo(days, h, m) {
    const d = new Date();
    d.setDate(d.getDate() - days);
    d.setHours(h || 12, m || 0, 0, 0);
    return dstr(d) + "T" + pad(d.getHours()) + ":" + pad(d.getMinutes());
  }
  function dAgo(days) { return dtAgo(days, 12).slice(0, 10); }
  function dAhead(days) { return dAgo(-days); }

  let seq = 0;
  function mk(o) {
    seq += 1;
    return {
      id: "HPB-" + ("0000" + seq).slice(-5),
      dateTime: o.dateTime,
      source: o.source,
      branch: o.branch,
      orderNumber: o.orderNumber || "",
      orderDateTime: o.orderDateTime || "",
      category: o.category,
      priority: o.priority || "Normal",
      description: o.description,
      deliveryPlatform: o.deliveryPlatform || "Not applicable",
      customerName: o.customerName,
      customerPhone: o.customerPhone,
      reviewUrl: o.reviewUrl || "",
      reportedBy: o.reportedBy || "",
      callbackRequired: o.callbackRequired || "No",
      branchContact: o.branchContact || "",
      followUpDate: o.followUpDate || "",
      status: o.status || "New",
      resolution: o.resolution || "",
      resolvedAt: o.resolvedAt || "",
      history: o.history || [{ ts: o.dateTime, type: "created", detail: "Complaint registered", by: "Demo data" }],
      createdAt: o.dateTime,
      updatedAt: o.updatedAt || o.dateTime
    };
  }

  const complaints = [

    mk({
      dateTime: dtAgo(6, 13, 20), source: "Call Centre", branch: "Jumeirah",
      orderNumber: "TLB-88213", orderDateTime: dtAgo(6, 12, 40),
      category: "Late Delivery", priority: "High",
      description: "Order arrived 55 minutes late and the burger was cold. Customer demands an explanation and a voucher.",
      deliveryPlatform: "Talabat", customerName: "Salem Al Hosani", customerPhone: "+971 54 220 7781",
      reportedBy: "Ayesha K. (Call Centre)", callbackRequired: "Yes",
      followUpDate: dAgo(4), status: "Resolved", resolvedAt: dtAgo(5, 16, 5),
      resolution: "Voucher code HPB50 issued and rider escalation filed with Talabat. Customer informed.",
      history: [
        { ts: dtAgo(6, 13, 20), type: "created", detail: "Complaint registered", by: "Demo data" },
        { ts: dtAgo(6, 14, 2), type: "status", detail: "New → Assigned to Branch", by: "Demo data" },
        { ts: dtAgo(5, 16, 5), type: "resolved", detail: "Resolved: voucher HPB50 issued", by: "Demo data" }
      ]
    }),

    mk({
      dateTime: dtAgo(6, 19, 45), source: "Google Review", branch: "Muroor",
      reviewUrl: "https://maps.google.com/?cid=demo-review-1002",
      category: "Food Quality", priority: "Normal",
      description: "1-star review: patty was dry and the bun fell apart. Wants a callback before updating the review.",
      customerName: "Omar Al Mansouri", customerPhone: "+971 50 411 2288",
      callbackRequired: "Yes", followUpDate: dAgo(3), status: "Closed", resolvedAt: dtAgo(4, 11, 30),
      resolution: "Branch manager called, replacement meal offered. Customer edited review to 4 stars.",
      history: [
        { ts: dtAgo(6, 19, 45), type: "created", detail: "Complaint registered", by: "Demo data" },
        { ts: dtAgo(5, 9, 15), type: "note", detail: "Branch manager attempted callback, no answer.", by: "Demo data" },
        { ts: dtAgo(4, 11, 30), type: "status", detail: "Resolved → Closed", by: "Demo data" }
      ]
    }),

    mk({
      dateTime: dtAgo(5, 12, 10), source: "Call Centre", branch: "Khalifa",
      orderNumber: "HPB-40711", orderDateTime: dtAgo(5, 11, 25),
      category: "Missing Items", priority: "Urgent",
      description: "Family combo missing 2 drinks and fries. Customer very upset, order was for a child's birthday.",
      deliveryPlatform: "Not applicable", customerName: "Fatima Al Zaabi", customerPhone: "+971 56 903 1120",
      reportedBy: "Ayesha K. (Call Centre)", callbackRequired: "Yes", branchContact: "Kareem H.",
      followUpDate: dAgo(3), status: "Resolved", resolvedAt: dtAgo(3, 18, 40),
      resolution: "Full missing items redelivered within 40 minutes plus dessert as goodwill.",
      history: [
        { ts: dtAgo(5, 12, 10), type: "created", detail: "Complaint registered", by: "Demo data" },
        { ts: dtAgo(5, 12, 30), type: "assigned", detail: "Assigned to Khalifa (Kareem H.)", by: "Demo data" },
        { ts: dtAgo(3, 18, 40), type: "resolved", detail: "Resolved: items redelivered", by: "Demo data" }
      ]
    }),

    mk({
      dateTime: dtAgo(4, 20, 5), source: "WhatsApp", branch: "Ajman",
      orderNumber: "DLV-55190", orderDateTime: dtAgo(4, 19, 15),
      category: "Wrong Order", priority: "High",
      description: "Received a spicy chicken meal instead of the double beef burger ordered. Customer is allergic to spicy food.",
      deliveryPlatform: "Deliveroo", customerName: "Rahul Menon", customerPhone: "+971 52 668 4310",
      callbackRequired: "No", followUpDate: dAgo(0), status: "Under Investigation",
      history: [
        { ts: dtAgo(4, 20, 5), type: "created", detail: "Complaint registered", by: "Demo data" },
        { ts: dtAgo(4, 20, 30), type: "status", detail: "New → Under Investigation", by: "Demo data" }
      ]
    }),

    mk({
      dateTime: dtAgo(4, 14, 30), source: "Instagram", branch: "Sharjah",
      category: "Packaging", priority: "Normal",
      description: "DM with photo: burger box was crushed and sauce leaked into the bag.",
      customerName: "Noura Al Suwaidi", customerPhone: "+971 55 172 6643",
      followUpDate: dAhead(1), status: "Waiting for Customer",
      history: [
        { ts: dtAgo(4, 14, 30), type: "created", detail: "Complaint registered", by: "Demo data" },
        { ts: dtAgo(3, 10, 5), type: "status", detail: "New → Waiting for Customer", by: "Demo data" },
        { ts: dtAgo(3, 10, 6), type: "note", detail: "Asked customer to send order number via DM.", by: "Demo data" }
      ]
    }),

    mk({
      dateTime: dtAgo(4, 18, 40), source: "WhatsApp", branch: "Fujairah",
      orderNumber: "DLV-55231", orderDateTime: dtAgo(4, 17, 50),
      category: "Late Delivery", priority: "High",
      description: "Delivery took over an hour on a pre-order placed the day before.",
      deliveryPlatform: "Careem", customerName: "Yousef Hamad", customerPhone: "+971 50 993 5527",
      followUpDate: dAgo(2), status: "Resolved", resolvedAt: dtAgo(2, 13, 10),
      resolution: "Delivery fee refunded to Careem wallet. Store reminded about pre-order scheduling.",
      history: [
        { ts: dtAgo(4, 18, 40), type: "created", detail: "Complaint registered", by: "Demo data" },
        { ts: dtAgo(2, 13, 10), type: "resolved", detail: "Resolved: fee refunded", by: "Demo data" }
      ]
    }),

    mk({
      dateTime: dtAgo(3, 13, 15), source: "Call Centre", branch: "Shahama",
      category: "Staff Behaviour", priority: "Urgent",
      description: "Customer reports the cashier was rude and refused to fix a wrong charge. Requests a formal apology.",
      customerName: "Mariam Al Ameri", customerPhone: "+971 55 640 8812",
      reportedBy: "Ayesha K. (Call Centre)", callbackRequired: "Yes", branchContact: "Diana P.",
      followUpDate: dAgo(0), status: "Assigned to Branch",
      history: [
        { ts: dtAgo(3, 13, 15), type: "created", detail: "Complaint registered", by: "Demo data" },
        { ts: dtAgo(3, 13, 40), type: "assigned", detail: "Assigned to Shahama (Diana P.)", by: "Demo data" },
        { ts: dtAgo(3, 13, 41), type: "status", detail: "New → Assigned to Branch", by: "Demo data" }
      ]
    }),

    mk({
      dateTime: dtAgo(3, 15, 50), source: "Google Review", branch: "Baniyas",
      reviewUrl: "https://maps.google.com/?cid=demo-review-1008",
      category: "Payment", priority: "Normal",
      description: "Review mentions being charged twice for the same meal at the counter.",
      customerName: "Hamdan Al Shamsi", customerPhone: "+971 56 330 7745",
      followUpDate: dAhead(2), status: "New",
      history: [{ ts: dtAgo(3, 15, 50), type: "created", detail: "Complaint registered", by: "Demo data" }]
    }),

    mk({
      dateTime: dtAgo(3, 21, 10), source: "Talabat", branch: "RAK",
      orderNumber: "TLB-88517", orderDateTime: dtAgo(3, 20, 30),
      category: "Missing Items", priority: "High",
      description: "No dips and no drinks in the delivery bag. Third time this month at this branch.",
      deliveryPlatform: "Talabat", customerName: "Aisha Rahman", customerPhone: "+971 50 776 9903",
      followUpDate: dAgo(1), status: "Under Investigation",
      history: [
        { ts: dtAgo(3, 21, 10), type: "created", detail: "Complaint registered", by: "Demo data" },
        { ts: dtAgo(3, 21, 35), type: "status", detail: "New → Under Investigation", by: "Demo data" }
      ]
    }),

    mk({
      dateTime: dtAgo(2, 12, 35), source: "Facebook", branch: "Zakher",
      category: "Refund", priority: "Normal",
      description: "Customer paid online but the order was cancelled by the store; refund not received after 3 days.",
      customerName: "Saeed Al Kaabi", customerPhone: "+971 54 118 2267",
      followUpDate: dAhead(3), status: "Waiting for Customer",
      history: [
        { ts: dtAgo(2, 12, 35), type: "created", detail: "Complaint registered", by: "Demo data" },
        { ts: dtAgo(2, 13, 0), type: "note", detail: "Requested bank statement screenshot to trace the refund.", by: "Demo data" }
      ]
    }),

    mk({
      dateTime: dtAgo(2, 19, 20), source: "Call Centre", branch: "Al Ain",
      orderNumber: "HPB-40988", orderDateTime: dtAgo(2, 18, 45),
      category: "Food Quality", priority: "Urgent",
      description: "Customer claims a piece of plastic was found inside a kids meal. Possible safety incident — needs same-day action.",
      deliveryPlatform: "Not applicable", customerName: "Khalid Al Dhaheri", customerPhone: "+971 50 221 3384",
      reportedBy: "Mona S. (Call Centre)", callbackRequired: "Yes", branchContact: "Faisal N.",
      followUpDate: dAgo(1), status: "Under Investigation",
      history: [
        { ts: dtAgo(2, 19, 20), type: "created", detail: "Complaint registered", by: "Demo data" },
        { ts: dtAgo(2, 19, 45), type: "note", detail: "Photos requested and received from customer.", by: "Demo data" },
        { ts: dtAgo(2, 20, 0), type: "status", detail: "New → Under Investigation", by: "Demo data" }
      ]
    }),

    mk({
      dateTime: dtAgo(1, 13, 5), source: "Call Centre", branch: "Muroor",
      category: "Customer Service", priority: "Normal",
      description: "Nobody answered the drive-thru intercom for 10 minutes; customer left without ordering.",
      customerName: "Amna Al Baloushi", customerPhone: "+971 55 887 1206",
      followUpDate: dAhead(1), status: "Assigned to Branch", branchContact: "Tariq J.",
      history: [
        { ts: dtAgo(1, 13, 5), type: "created", detail: "Complaint registered", by: "Demo data" },
        { ts: dtAgo(1, 13, 20), type: "assigned", detail: "Assigned to Muroor (Tariq J.)", by: "Demo data" }
      ]
    }),

    mk({
      dateTime: dtAgo(1, 17, 45), source: "Noon", branch: "Jumeirah",
      orderNumber: "NOON-7731", orderDateTime: dtAgo(1, 16, 55),
      category: "Late Delivery", priority: "High",
      description: "Order arrived 50 minutes late. Same customer as HPB-00002 — repeat issue.",
      deliveryPlatform: "Noon", customerName: "Omar Al Mansouri", customerPhone: "+971 50 411 2288",
      followUpDate: dAhead(2), status: "New",
      history: [{ ts: dtAgo(1, 17, 45), type: "created", detail: "Complaint registered", by: "Demo data" }]
    }),

    mk({
      dateTime: dtAgo(0, 9, 30), source: "Call Centre", branch: "Khalifa",
      orderNumber: "HPB-41206", orderDateTime: dtAgo(0, 8, 50),
      category: "Wrong Order", priority: "Urgent",
      description: "Breakfast order completely wrong (received burgers). Customer is on a tight schedule and angry.",
      customerName: "Bedour Al Nuaimi", customerPhone: "+971 56 447 9908",
      reportedBy: "Mona S. (Call Centre)", callbackRequired: "Yes",
      followUpDate: dAhead(1), status: "New",
      history: [{ ts: dtAgo(0, 9, 30), type: "created", detail: "Complaint registered", by: "Demo data" }]
    }),

    mk({
      dateTime: dtAgo(0, 10, 15), source: "Google Review", branch: "Falah",
      reviewUrl: "https://maps.google.com/?cid=demo-review-1015",
      category: "Food Quality", priority: "Normal",
      description: "Review: fries tasted like they were refried and the cheese sauce was cold.",
      customerName: "Zayed Al Ameri", customerPhone: "+971 50 664 5519",
      followUpDate: dAhead(3), status: "New",
      history: [{ ts: dtAgo(0, 10, 15), type: "created", detail: "Complaint registered", by: "Demo data" }]
    }),

    mk({
      dateTime: dtAgo(0, 11, 40), source: "Branch", branch: "Rabdan",
      category: "Missing Items", priority: "High",
      description: "Walk-in customer came back to the counter: drinks missing from a takeaway bag bought 15 minutes earlier.",
      customerName: "Maitha Al Hameli", customerPhone: "+971 55 309 4472",
      branchContact: "Lina W.", followUpDate: dAgo(0), status: "Assigned to Branch",
      history: [
        { ts: dtAgo(0, 11, 40), type: "created", detail: "Complaint registered", by: "Demo data" },
        { ts: dtAgo(0, 11, 45), type: "assigned", detail: "Assigned to Rabdan (Lina W.)", by: "Demo data" }
      ]
    }),

    mk({
      dateTime: dtAgo(0, 12, 50), source: "Talabat", branch: "Ajman",
      orderNumber: "TLB-89004", orderDateTime: dtAgo(0, 11, 55),
      category: "Late Delivery", priority: "Normal",
      description: "App showed 25 minutes, actual delivery 65 minutes during lunch rush.",
      deliveryPlatform: "Talabat", customerName: "Gaurav Shah", customerPhone: "+971 52 918 7733",
      followUpDate: dAhead(2), status: "New",
      history: [{ ts: dtAgo(0, 12, 50), type: "created", detail: "Complaint registered", by: "Demo data" }]
    }),

    mk({
      dateTime: dtAgo(8, 14, 0), source: "Email", branch: "Sharjah",
      category: "Customer Service", priority: "Normal",
      description: "Email complaint: no one responded to the online contact form for a week.",
      customerName: "Laila Al Hashimi", customerPhone: "+971 56 202 8841",
      followUpDate: dAgo(5), status: "Closed", resolvedAt: dtAgo(6, 10, 20),
      resolution: "Apology email sent, feedback form issue fixed with the web team.",
      history: [
        { ts: dtAgo(8, 14, 0), type: "created", detail: "Complaint registered", by: "Demo data" },
        { ts: dtAgo(6, 10, 20), type: "status", detail: "Resolved → Closed", by: "Demo data" }
      ]
    })
  ];

  return {
    IS_DEMO: true,
    label: "DEMO DATA",
    note: "Fictional demonstration records. Never mixed with real company complaints.",
    complaints: complaints
  };
})();
