const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwCu2bb3xAbvw0a4272JDu6PK0jRc0LTa5LenoCHx0kaGLanrlUESg0lIOrw0SiwS8A/exec";
const OFF_DATES_STORAGE_KEY = "LTO_TOGGLED_OFF_DATES_2026";
const SETTINGS_STORAGE_KEY = "LTO_CPAO_SETTINGS_2026";
const CUSTOM_ACCOMPLISHMENTS_KEY = "LTO_CPAO_ACCOMPLISHMENTS_2026";
const LAST_WORKING_ADD_ACTION_KEY = "LTO_WORKING_ADD_ACTION_V1";
const LAST_WORKING_UPDATE_ACTION_KEY = "LTO_WORKING_UPDATE_ACTION_V1";
const PENDING_SYNC_QUEUE_KEY = "LTO_PENDING_SYNC_QUEUE_V1";
const COLUMN_LABELS_STORAGE_KEY = "LTO_CPAO_COLUMN_LABELS_2026";

const DEFAULT_CUSTOM_COLUMN_LABELS = {
    col_adminNo: "Admin No.",
    col_platform: "Platform",
    col_dateReceived: "Date Received",
    col_referralNo: "Referral / Ticket #",
    col_complainantName: "Complainant",
    col_category: "Category",
    col_ticketType: "Type",
    col_ticketDetails: "Details of Ticket",
    col_responseDetails: "Response Details",
    col_actionTaken: "Action Taken",
    col_status: "Status",
    col_remarks: "Remarks",
    col_actions: "Actions",
    graph_received: "Received",
    graph_closed: "Closed",
    graph_pending: "Pending"
};

const OFFICIAL_ROLE_RANKS = [
    "Regional Director",
    "Assistant Secretary",
    "Executive Director",
    "Division Chief",
    "Chief"
];

const REPORT_SIGNATORIES = [
    { name: "JANZEN HUWEE N. BALTORES", designation: "Public Relations Officer I" },
    { name: "JHOVANN JAPHET C. TALLEDO", designation: "Public Relations Officer I" },
    { name: "MICHELLE B. LLANERA", designation: "Public Relations Officer II" }
];

const CATEGORY_GROUPS = [
    "Licenses and Permits",
    "Vehicle Registration",
    "Law Enforcement",
    "Intelligence and Investigation Division (IID)",
    "Land Transportation Management System",
    "Client Feedbacks",
    "Other concerns"
];

const STANDARD_ENDORSEMENT_TEMPLATE_FIELDS = {
    letterDate: "{todayDate}",
    salutation: "Dear Director {chiefLastName},",
    opening: "This is to respectfully endorse to your Office, the <strong>{ticketSubjectTerm}</strong> {briefDescription}, filed by <strong>{complainantName}</strong>, initially lodged through <strong>{platform}</strong>{forwardedClause} on <strong>{dateReceivedFormatted}</strong>. Please see the attached file for your reference.",
    showCause: "Without prejudice to the exercise of your Office's authority, should the complaint be found to have sufficient merit, the issuance of the appropriate Show Cause Order may be considered in accordance with existing laws, rules, regulations, and applicable LTO issuances.",
    deadline: "Pursuant to the operational guidelines, and the provisions stated in Section 8 (Accountability of Heads of Offices and Agencies) of Republic Act No. 11032 or the Ease of Doing Business and Efficient Government Service Delivery (EODB EGSD) Act of 2018, we would like to respectfully request your office <strong>to respond on {dueDate} or within (20) twenty working days from the date this letter was received</strong> citing the Ticket Reference No. <strong>{ticketRefNo}</strong>.",
    furnishedReq: "In addition, we kindly request that a copy of your response or action taken be furnished to the client and to the Offices listed below for monitoring and record-keeping purposes.\n\nFor your information and action deemed necessary.",
    closing: "Very Respectfully Yours,",
    sigName: "MARY MAY M. JACOB",
    sigTitle: "Head, LTO Strategic Communications",
    sigOffice: "Central – Public Assistance Office",
    copyFurnished: [
        "CENTRAL PUBLIC ASSISTANCE OFFICE | This Office | lto.feedback@gmail.com",
        "RDMPAO | {officeName} | {rdmpaoEmail}",
        "{complainantName} | Complainant | {complainantEmail}"
    ].join("\n")
};

let currentUser = {
    username: "admin36",
    role: "Super Admin",
    name: "Admin 36",
    adminNo: "ADMIN 36",
    logColor: "#9a4e2a",
    canReports: true,
    canDeleteLogs: true,
    canManageUsers: true,
    canAccessSettings: true
};

let pendingTicketSubmission = null;
let editingTicketOriginalState = null;
let lastTicketModalDraft = null;
let lastEndorseModalDraft = null;
let selectedDirectoryIndex = 0;
let activeOfficialsRegionIndex = 0;
let activeTemplateInputField = null;
let isEndorseLetterEditing = false;
let isReportPreviewEditing = false;
let isAccomplishmentPreviewEditing = false;
let isSavingTicket = false;
let isFlushingSyncQueue = false;
let hasShownScriptActionNotice = false;
let customAccomplishments = [];
let supervisorPeriod = "daily";

document.addEventListener("focusin", (e) => {
    if (e.target && e.target.classList && e.target.classList.contains("tpl-form-field")) {
        activeTemplateInputField = e.target;
    }
});

let AppState = {
    tickets: [],
    users: [
        { username: "admin36", name: "Admin 36", role: "Super Admin", defaultPortal: "FACEBOOK", pass: "admin123", logColor: "#9a4e2a", canReports: true, canDeleteLogs: true, canManageUsers: true, canAccessSettings: true },
        { username: "adminsv", name: "Supervisor Admin", role: "AdminSV", defaultPortal: "FACEBOOK", pass: "123", logColor: "Default", canReports: true, canDeleteLogs: false, canManageUsers: false, canAccessSettings: false },
        { username: "janzen", name: "Janzen Huwee N. Baltores", role: "Admin", defaultPortal: "FACEBOOK", pass: "password", logColor: "Default", canReports: false, canDeleteLogs: false, canManageUsers: false, canAccessSettings: false }
    ],
    directory: [
        { code: "RO1", office: "Regional Office 1", chief: "ATTY. NESTOR V. FERNANDEZ II", position: "Regional Director", address: "San Fernando, La Union", number: "(072) 888-1234", email: "roi@lto.gov.ph", officials: [] },
        { code: "RO2", office: "Regional Office 2", chief: "ENGR. SWANSON R. TIONG", position: "Regional Director", address: "Tuguegarao City, Cagayan", number: "(078) 844-5678", email: "ro2@lto.gov.ph", officials: [] },
        { code: "RO3", office: "Regional Office 3", chief: "ATTY. CLEMENTE G. SAPLALA", position: "Regional Director", address: "City of San Fernando, Pampanga", number: "(045) 961-1111", email: "ro3@lto.gov.ph", officials: [] },
        { code: "RO4A", office: "Regional Office 4-A", chief: "ELMER J. DECENA", position: "Regional Director", address: "Lipa City, Batangas", number: "(043) 756-2222", email: "dmsacltocalabarzon@gmail.com", officials: [] },
        { code: "RO4B", office: "Regional Office 4-B", chief: "MARIETTA R. OLAN", position: "Regional Director", address: "Quezon City", number: "(02) 921-3333", email: "ro4b@lto.gov.ph", officials: [] },
        { code: "RO5", office: "Regional Office 5", chief: "NOEL L. TRAJANO", position: "Regional Director", address: "Rawis, Legazpi City", number: "(052) 480-4444", email: "ro5@lto.gov.ph", officials: [] },
        { code: "RO6", office: "Regional Office 6", chief: "ROLANDO P. RAMOS", position: "Regional Director", address: "Iloilo City", number: "(033) 337-5555", email: "ro6@lto.gov.ph", officials: [] },
        { code: "RO7", office: "Regional Office 7", chief: "MENCHU J. ESTRADA", position: "Regional Director", address: "Cebu City", number: "(032) 254-6666", email: "ro7@lto.gov.ph", officials: [] },
        { code: "RO8", office: "Regional Office 8", chief: "RODOLFO C. DEL ROSARIO", position: "Regional Director", address: "Tacloban City", number: "(053) 321-7777", email: "ro8@lto.gov.ph", officials: [] },
        { code: "RO9", office: "Regional Office 9", chief: "AMINA D. BACARAT", position: "Regional Director", address: "Zamboanga City", number: "(062) 991-8888", email: "ro9@lto.gov.ph", officials: [] },
        { code: "RO10", office: "Regional Office 10", chief: "JOANNA R. DIMAANO", position: "Regional Director", address: "Cagayan de Oro City", number: "(088) 857-9999", email: "ro10@lto.gov.ph", officials: [] },
        { code: "RO11", office: "Regional Office 11", chief: "ELMA R. GOMEZ", position: "Regional Director", address: "Davao City", number: "(082) 224-0000", email: "ro11@lto.gov.ph", officials: [] },
        { code: "RO12", office: "Regional Office 12", chief: "MACARIO B. GONZALES", position: "Regional Director", address: "Koronadal City", number: "(083) 228-1111", email: "ro12@lto.gov.ph", officials: [] },
        { code: "CARAGA", office: "CARAGA Region", chief: "LIZA B. BUENAVENTURA", position: "Regional Director", address: "Butuan City", number: "(085) 341-2222", email: "caraga@lto.gov.ph", officials: [] },
        { code: "NCR", office: "National Capital Region (NCR)", chief: "JUAN DELA CRUZ", position: "Regional Director", address: "East Ave., Quezon City", number: "(02) 921-4321", email: "ncr@lto.gov.ph", officials: [] },
        { code: "NIR", office: "Negros Island Region (NIR)", chief: "ANTONIO V. GOMEZ", position: "Regional Director", address: "Bacolod City", number: "(034) 433-5544", email: "nir@lto.gov.ph", officials: [] }
    ],
    settings: {
        enableResponderClipboard: true,
        columnLabels: { ...DEFAULT_CUSTOM_COLUMN_LABELS },
        categoryGroups: {
            "Licenses and Permits": [],
            "Vehicle Registration": [],
            "Law Enforcement": [],
            "Intelligence and Investigation Division (IID)": [],
            "Land Transportation Management System": [],
            "Client Feedbacks": [],
            "Other concerns": []
        },
        categories: [],
        ticketTypes: [
            "Simple (Request for Information, Feedback, etc.)",
            "Complex (Needs verification)",
            "Highly Technical (Endorsement)"
        ],
        actionsTaken: [
            "Answered",
            "Answered/Endorsed to Region 4A",
            "Waiting for further information /documents needed from the client"
        ],
        statuses: [
            "Closed",
            "Pending"
        ],
        platforms: [
            { name: "FACEBOOK", autoGen: true, prefix: "CPAO" },
            { name: "IMKC", autoGen: true, prefix: "IMKC" },
            { name: "CDMPAO", autoGen: true, prefix: "CPAO" },
            { name: "LTO MAILBOX", autoGen: true, prefix: "CPAO" },
            { name: "ARTA", autoGen: false, prefix: "ARTA" },
            { name: "8888", autoGen: false, prefix: "8888" },
            { name: "PACe", autoGen: false, prefix: "PACE" },
            { name: "CCB", autoGen: false, prefix: "CCB" }
        ],
        customFields: [],
        endorsementForm: { ...STANDARD_ENDORSEMENT_TEMPLATE_FIELDS },
        reportConfig: {
            republic: "Republic of the Philippines",
            department: "Department of Transportation",
            agency: "LAND TRANSPORTATION OFFICE",
            office: "Central Public Assistance Office (CPAO)",
            title: "EXECUTIVE RESOLUTION & PORTAL PERFORMANCE REPORT",
            logo1Url: "",
            logo2Url: "",
            logo3Url: "",
            logoAlignment: "left",
            headerTextAlign: "center",
            headerSpacing: "standard",
            showRepublic: true,
            showDepartment: true,
            notedName: "MARY MAY M. JACOB",
            notedDesig: "Head, LTO COMMS/CPAO"
        }
    },
    templates: [
        { title: "STANDARD GREETING", text: "Good day! Thank you for reaching out to the LTO Central Public Assistance Office." }
    ],
    toggledOffDates: []
};

let calcCurrentYear = 2026;
let calcCurrentMonth = 4;
let pickerViewYear = 2026;
let pickerViewMonth = 10;

function getCustomColumnLabels() {
    if (!AppState.settings.columnLabels || typeof AppState.settings.columnLabels !== "object") {
        AppState.settings.columnLabels = { ...DEFAULT_CUSTOM_COLUMN_LABELS };
    } else {
        AppState.settings.columnLabels = {
            ...DEFAULT_CUSTOM_COLUMN_LABELS,
            ...AppState.settings.columnLabels
        };
    }
    return AppState.settings.columnLabels;
}

function getColLabel(key) {
    const labels = getCustomColumnLabels();
    return labels[key] || DEFAULT_CUSTOM_COLUMN_LABELS[key] || key;
}

function renderCustomColumnLabelsEditor() {
    const grid = document.getElementById("customColumnLabelsGrid");
    if (!grid) return;
    const labels = getCustomColumnLabels();

    const fieldDefs = [
        { key: "col_adminNo", desc: "Log Table: Admin No." },
        { key: "col_platform", desc: "Log Table: Platform" },
        { key: "col_dateReceived", desc: "Log Table: Date Received" },
        { key: "col_referralNo", desc: "Log Table: Ticket #" },
        { key: "col_complainantName", desc: "Log Table: Complainant" },
        { key: "col_category", desc: "Log Table: Category" },
        { key: "col_ticketType", desc: "Log Table: Type" },
        { key: "col_ticketDetails", desc: "Log Table: Ticket Details" },
        { key: "col_responseDetails", desc: "Log Table: Response Details" },
        { key: "col_actionTaken", desc: "Log Table: Action Taken" },
        { key: "col_status", desc: "Log Table: Status" },
        { key: "col_remarks", desc: "Log Table: Remarks" },
        { key: "graph_received", desc: "Graph / Chart Series 1 (e.g. Received)" },
        { key: "graph_closed", desc: "Graph / Chart Series 2 (e.g. Closed)" },
        { key: "graph_pending", desc: "Graph / Chart Series 3 (e.g. Pending)" }
    ];

    grid.innerHTML = fieldDefs.map(f => `
        <div class="bg-slate-950 border border-slate-800 rounded-lg p-2.5 space-y-1">
            <label class="block text-[10px] font-bold uppercase text-slate-400">${escapeHtml(f.desc)} <span class="text-slate-600">(Default: ${escapeHtml(DEFAULT_CUSTOM_COLUMN_LABELS[f.key])})</span></label>
            <input type="text" data-col-key="${f.key}" value="${escapeHtml(labels[f.key] || DEFAULT_CUSTOM_COLUMN_LABELS[f.key])}" class="custom-col-label-input w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white font-semibold focus:outline-none focus:border-amber-400">
        </div>
    `).join("");
}

async function saveColumnLabelsConfig() {
    if (!isAdminTL() && !isSuperAdmin()) {
        showSystemAlert("Access Denied", "Only Super Admin and AdminTL can customize column names.", "🔒");
        return;
    }
    const nextLabels = { ...DEFAULT_CUSTOM_COLUMN_LABELS };
    document.querySelectorAll(".custom-col-label-input").forEach(inp => {
        const key = inp.getAttribute("data-col-key");
        if (key) {
            const val = String(inp.value || "").trim();
            nextLabels[key] = val || DEFAULT_CUSTOM_COLUMN_LABELS[key];
        }
    });
    AppState.settings.columnLabels = nextLabels;
    try { localStorage.setItem(COLUMN_LABELS_STORAGE_KEY, JSON.stringify(nextLabels)); } catch (e) {}
    persistLocalSettingsCache();
    renderTableHeadersAndColumns();
    renderTable();
    if (document.getElementById("viewReports")?.style.display !== "none" && document.getElementById("repStartDate")?.value && document.getElementById("repEndDate")?.value) {
        generateReport();
    }
    showToast("Column names saved and applied to tables & graphs.");
    await saveAllSettingsToCloud(true);
}

function resetColumnLabelsToDefault() {
    if (!isAdminTL() && !isSuperAdmin()) return;
    AppState.settings.columnLabels = { ...DEFAULT_CUSTOM_COLUMN_LABELS };
    try { localStorage.setItem(COLUMN_LABELS_STORAGE_KEY, JSON.stringify(AppState.settings.columnLabels)); } catch (e) {}
    persistLocalSettingsCache();
    renderCustomColumnLabelsEditor();
    renderTableHeadersAndColumns();
    renderTable();
    if (document.getElementById("viewReports")?.style.display !== "none" && document.getElementById("repStartDate")?.value && document.getElementById("repEndDate")?.value) {
        generateReport();
    }
    showToast("Column names reset to defaults.");
    saveAllSettingsToCloud(true);
}

function updateSyncStatusBadge(state = "synced", customLabel = "") {
    const badge = document.getElementById("syncStatusBadge");
    if (!badge) return;
    const queueLen = loadPendingSyncQueue().length;

    if (state === "syncing") {
        badge.className = "px-2.5 py-1.5 rounded-lg bg-slate-950 border border-sky-700/60 text-[11px] font-semibold text-sky-300";
        badge.textContent = customLabel || "🔄 Cloud: Syncing...";
        return;
    }

    if (queueLen > 0 || state === "queued") {
        badge.className = "px-2.5 py-1.5 rounded-lg bg-slate-950 border border-amber-600/60 text-[11px] font-semibold text-amber-300";
        badge.textContent = customLabel || `⏳ Cloud: Queued (${queueLen})`;
        return;
    }

    if (state === "error") {
        badge.className = "px-2.5 py-1.5 rounded-lg bg-slate-950 border border-rose-700/60 text-[11px] font-semibold text-rose-300";
        badge.textContent = customLabel || "⚠️ Cloud: Check Sync";
        return;
    }

    badge.className = "px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-[11px] font-semibold text-emerald-400";
    badge.textContent = customLabel || "✅ Cloud: Synchronized";
}

function deriveOperatorAdminNo(userObj) {
    if (!userObj) return "";
    const match = String(userObj.username || "").match(/\d+/) || String(userObj.name || "").match(/\d+/);
    if (match && match[0]) {
        return `ADMIN ${match[0]}`;
    }
    const cleanUsername = String(userObj.username || userObj.name || "").trim().toUpperCase();
    return cleanUsername ? `OPERATOR ${cleanUsername}` : "";
}

function resolveTicketSubjectTerm(ticket) {
    const rawType = String(ticket?.ticketType || "").toLowerCase().trim();
    if (rawType.includes("simple")) {
        return "request for information";
    }
    if (rawType.includes("complex")) {
        return "request for assistance";
    }
    if (rawType.includes("highly technical") || rawType.includes("technical")) {
        return "complaint";
    }
    return "complaint";
}

function setEndorsementEditState(editing) {
    isEndorseLetterEditing = !!editing;
    const area = document.getElementById("endorseLetterPrintArea");
    const btn = document.getElementById("btnToggleEditEndorseLetter");
    const badge = document.getElementById("endorseEditModeBadge");

    if (area) {
        area.contentEditable = isEndorseLetterEditing ? "true" : "false";
        if (isEndorseLetterEditing) {
            area.classList.add("ring-2", "ring-amber-400", "bg-amber-50/20");
            area.focus();
        } else {
            area.classList.remove("ring-2", "ring-amber-400", "bg-amber-50/20");
        }
    }

    if (btn) {
        if (isEndorseLetterEditing) {
            btn.textContent = "✅ Done Editing";
            btn.className = "px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded shadow text-xs transition";
        } else {
            btn.textContent = "✏️ Edit Letter";
            btn.className = "px-3.5 py-1.5 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded shadow text-xs transition";
        }
    }

    if (badge) {
        badge.classList.toggle("hidden", !isEndorseLetterEditing);
    }
}

function toggleEditEndorsementLetter() {
    setEndorsementEditState(!isEndorseLetterEditing);
    showToast(isEndorseLetterEditing ? "Editing enabled — click directly on text to edit." : "Letter edits applied.");
}

function setReportPreviewEditState(editing) {
    isReportPreviewEditing = !!editing;
    const docEl = document.getElementById("printableReportDocument");
    const btn = document.getElementById("btnToggleEditReportPreview");
    const badge = document.getElementById("reportEditModeBadge");

    if (docEl) {
        docEl.contentEditable = isReportPreviewEditing ? "true" : "false";
        if (isReportPreviewEditing) {
            docEl.classList.add("ring-2", "ring-amber-400");
            docEl.focus();
        } else {
            docEl.classList.remove("ring-2", "ring-amber-400");
        }
    }

    if (btn) {
        if (isReportPreviewEditing) {
            btn.textContent = "✅ Done Editing";
            btn.className = "px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg shadow transition";
        } else {
            btn.textContent = "✏️ Edit Report";
            btn.className = "px-3.5 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-lg shadow transition";
        }
    }

    if (badge) {
        badge.classList.toggle("hidden", !isReportPreviewEditing);
    }
}

function toggleEditReportPreview() {
    if (!document.getElementById("printableReportDocument")) {
        generateReport();
    }
    setReportPreviewEditState(!isReportPreviewEditing);
    showToast(isReportPreviewEditing ? "Report editing enabled — click directly on text to edit." : "Report edits applied.");
}

function ensureDirectoryOfficialsInitialized() {
    if (!Array.isArray(AppState.directory)) AppState.directory = [];
    AppState.directory.forEach((entry) => {
        if (!Array.isArray(entry.officials)) entry.officials = [];
        const hasMainChief = entry.chief && entry.officials.some(
            off => String(off.name || "").trim().toLowerCase() === String(entry.chief || "").trim().toLowerCase()
        );
        if (entry.chief && !hasMainChief) {
            entry.officials.unshift({
                roleRank: "Regional Director",
                name: entry.chief,
                position: entry.position || "Regional Director",
                division: entry.office || "Regional Office",
                email: entry.email || "",
                number: entry.number || ""
            });
        }
    });
}

function populateOfficialRoleRankDropdown(selectedRank = "Chief") {
    const sel = document.getElementById("offRoleRank");
    if (!sel) return;

    const existingValues = Array.from(sel.options).map(o => o.value);
    const mergedRanks = Array.from(new Set([...OFFICIAL_ROLE_RANKS, ...existingValues, selectedRank].filter(Boolean)));

    sel.innerHTML = mergedRanks.map(r =>
        `<option value="${escapeHtml(r)}">${escapeHtml(r)}</option>`
    ).join("");

    sel.value = mergedRanks.includes(selectedRank) ? selectedRank : "Chief";
}

function getRegionOfficialsList(regionIndex) {
    ensureDirectoryOfficialsInitialized();
    const entry = AppState.directory[regionIndex];
    if (!entry) return [];
    return Array.isArray(entry.officials) ? entry.officials : [];
}

function getEndorsementFormConfig() {
    if (!AppState.settings.endorsementForm || typeof AppState.settings.endorsementForm !== "object") {
        AppState.settings.endorsementForm = { ...STANDARD_ENDORSEMENT_TEMPLATE_FIELDS };
    } else {
        const merged = {
            ...STANDARD_ENDORSEMENT_TEMPLATE_FIELDS,
            ...AppState.settings.endorsementForm
        };
        if (merged.copyFurnished && merged.copyFurnished.includes("RUMPAD")) {
            merged.copyFurnished = merged.copyFurnished.replace(/RUMPAD/g, "RDMPAO");
        }
        AppState.settings.endorsementForm = merged;
    }
    return AppState.settings.endorsementForm;
}

function isTrafficViolationConcern(ticket) {
    if (!ticket) return false;
    const cat = String(ticket.category || "").toLowerCase().trim();
    const grp = String(getGroupForCategory(ticket.category) || "").toLowerCase().trim();
    const details = String(ticket.ticketDetails || "").toLowerCase().trim();

    if (
        cat.includes("traffic violation") ||
        cat.includes("traffic violations") ||
        cat.includes("show cause") ||
        cat.includes("apprehension") ||
        cat.includes("reckless")
    ) {
        return true;
    }

    if (grp.includes("law enforcement") || grp.includes("intelligence and investigation")) {
        return true;
    }

    if (details.includes("traffic violation") || details.includes("show cause")) {
        return true;
    }

    return false;
}

function formatDayMonthYear(dateInput) {
    const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    let d = null;
    if (!dateInput) {
        d = new Date();
    } else if (dateInput instanceof Date) {
        d = dateInput;
    } else {
        const iso = mmddyyyyToISO(String(dateInput).trim());
        d = new Date(iso + "T12:00:00");
    }
    if (!d || isNaN(d.getTime())) d = new Date();
    return `${String(d.getDate()).padStart(2, '0')} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

function replaceEndorsementTokens(text, dataMap) {
    let out = String(text || "");
    Object.keys(dataMap).forEach((key) => {
        const regex = new RegExp(`\\{${key}\\}`, "g");
        out = out.replace(regex, dataMap[key]);
    });
    return out;
}

function buildStandardLetterHeaderHtml() {
    const cfg = AppState.settings.reportConfig || {};
    const logos = [cfg.logo1Url, cfg.logo2Url, cfg.logo3Url].filter(u => u && u.trim() !== "");
    const logosHtml = logos.length > 0
        ? `<div class="flex items-center gap-2.5 shrink-0">${logos.map(u => `<img src="${u}" class="h-12 w-auto object-contain" />`).join("")}</div>`
        : `<div class="flex items-center gap-2 shrink-0">
               <div class="w-11 h-11 rounded-full border-2 border-blue-900 bg-blue-50 flex items-center justify-center text-[9px] font-extrabold text-blue-900">LTO</div>
               <div class="w-11 h-11 rounded-full border-2 border-amber-500 bg-amber-50 flex items-center justify-center text-[8px] font-extrabold text-amber-800 text-center leading-tight">BAGONG<br>PILIPINAS</div>
           </div>`;

    return `
        <div class="flex items-center justify-start gap-4 pb-2">
            ${logosHtml}
            <div class="text-left leading-tight">
                <p class="text-[11px] font-semibold text-slate-700">${escapeHtml(cfg.republic || "Republic of the Philippines")}</p>
                <p class="text-[11px] font-semibold text-slate-700">${escapeHtml(cfg.department || "Department of Transportation")}</p>
                <p class="text-sm font-extrabold text-slate-900 tracking-tight uppercase">${escapeHtml(cfg.agency || "LAND TRANSPORTATION OFFICE")}</p>
            </div>
        </div>
    `;
}

function renderStandardEndorsementLetterHtml(dataMap, formOverride = null) {
    const formCfg = { ...getEndorsementFormConfig(), ...(formOverride || {}) };
    const headerHtml = buildStandardLetterHeaderHtml();

    const furnishedLines = String(formCfg.copyFurnished || "")
        .split(/\r?\n/)
        .map(line => line.trim())
        .filter(Boolean);

    const furnishedHtml = furnishedLines.map((line) => {
        const parts = line.split("|").map(p => replaceEndorsementTokens(p.trim(), dataMap));
        const title = (parts[0] || "").replace(/RUMPAD/gi, "RDMPAO");
        const sub = parts[1] || "";
        const email = parts[2] || "";
        if (!title && !sub && !email) return "";
        return `
            <li class="mb-2">
                ${title ? `<div class="font-extrabold text-slate-900 uppercase text-[11px]">${title}</div>` : ""}
                ${sub ? `<div class="text-[11px] text-slate-700">${sub}</div>` : ""}
                ${email ? `<div class="text-[11px] text-blue-700 underline">${email}</div>` : ""}
            </li>
        `;
    }).join("");

    const furnishedReqParagraphs = String(formCfg.furnishedReq || "")
        .split(/\n\s*\n/)
        .filter(p => p.trim() !== "")
        .map(p => `<p class="text-justify leading-relaxed">${replaceEndorsementTokens(p.trim(), dataMap)}</p>`)
        .join("");

    const sigBlock = dataMap.signatureBlock || `
        <div class="font-bold text-xs text-slate-800 pl-6 mb-1">[SIGNED]</div>
        <p class="font-extrabold uppercase text-xs text-slate-900">${escapeHtml(formCfg.sigName || STANDARD_ENDORSEMENT_TEMPLATE_FIELDS.sigName)}</p>
        <p class="text-slate-800 text-xs">${replaceEndorsementTokens(formCfg.sigTitle || STANDARD_ENDORSEMENT_TEMPLATE_FIELDS.sigTitle, dataMap)}</p>
        <p class="text-slate-700 text-xs">${replaceEndorsementTokens(formCfg.sigOffice || STANDARD_ENDORSEMENT_TEMPLATE_FIELDS.sigOffice, dataMap)}</p>
    `;

    const showCauseHtml = (dataMap.includeShowCause !== false && String(formCfg.showCause || "").trim() !== "")
        ? `<p class="text-justify leading-relaxed text-xs text-slate-900">${replaceEndorsementTokens(formCfg.showCause, dataMap)}</p>`
        : "";

    return `
        <div class="page-break-inside-avoid space-y-4">
            ${headerHtml}
            <p class="text-xs text-slate-800 pt-1">${replaceEndorsementTokens(formCfg.letterDate, dataMap)}</p>
            <div class="space-y-0.5 text-xs text-slate-900">
                <p class="font-extrabold uppercase">${dataMap.chiefName}</p>
                <p>${dataMap.chiefPosition}</p>
                <p>${dataMap.agencyName}</p>
                <p>${dataMap.officeAddress}</p>
            </div>
            <p class="text-xs text-slate-900">${replaceEndorsementTokens(formCfg.salutation, dataMap)}</p>
            <p class="text-justify leading-relaxed text-xs text-slate-900">${replaceEndorsementTokens(formCfg.opening, dataMap)}</p>
            ${showCauseHtml}
            <p class="text-justify leading-relaxed text-xs text-slate-900">${replaceEndorsementTokens(formCfg.deadline, dataMap)}</p>
            <div class="space-y-3 text-xs text-slate-900">${furnishedReqParagraphs}</div>
            <div class="pt-3 text-xs text-slate-900">
                <p>${replaceEndorsementTokens(formCfg.closing, dataMap)}</p>
                <div class="pt-5">${sigBlock}</div>
            </div>
            <div class="pt-4">
                <p class="text-[11px] font-bold text-slate-800 mb-1.5">Copy furnished:</p>
                <ul class="list-disc pl-5 space-y-1">${furnishedHtml}</ul>
            </div>
        </div>
        ${dataMap.attachmentHtml || ""}
    `;
}

function populateEndorsementFormInputs() {
    const f = getEndorsementFormConfig();
    const map = {
        tplFormDate: f.letterDate,
        tplFormSalutation: f.salutation,
        tplFormOpening: f.opening,
        tplFormShowCause: f.showCause,
        tplFormDeadline: f.deadline,
        tplFormFurnishedReq: f.furnishedReq,
        tplFormClosing: f.closing,
        tplFormSigTitle: f.sigTitle,
        tplFormSigOffice: f.sigOffice,
        tplFormCopyFurnished: f.copyFurnished
    };
    Object.keys(map).forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.value = map[id] || "";
    });
}

function syncFormTemplateFields() {
    AppState.settings.endorsementForm = {
        letterDate: document.getElementById("tplFormDate")?.value ?? STANDARD_ENDORSEMENT_TEMPLATE_FIELDS.letterDate,
        salutation: document.getElementById("tplFormSalutation")?.value ?? STANDARD_ENDORSEMENT_TEMPLATE_FIELDS.salutation,
        opening: document.getElementById("tplFormOpening")?.value ?? STANDARD_ENDORSEMENT_TEMPLATE_FIELDS.opening,
        showCause: document.getElementById("tplFormShowCause")?.value ?? STANDARD_ENDORSEMENT_TEMPLATE_FIELDS.showCause,
        deadline: document.getElementById("tplFormDeadline")?.value ?? STANDARD_ENDORSEMENT_TEMPLATE_FIELDS.deadline,
        furnishedReq: document.getElementById("tplFormFurnishedReq")?.value ?? STANDARD_ENDORSEMENT_TEMPLATE_FIELDS.furnishedReq,
        closing: document.getElementById("tplFormClosing")?.value ?? STANDARD_ENDORSEMENT_TEMPLATE_FIELDS.closing,
        sigName: STANDARD_ENDORSEMENT_TEMPLATE_FIELDS.sigName,
        sigTitle: document.getElementById("tplFormSigTitle")?.value ?? STANDARD_ENDORSEMENT_TEMPLATE_FIELDS.sigTitle,
        sigOffice: document.getElementById("tplFormSigOffice")?.value ?? STANDARD_ENDORSEMENT_TEMPLATE_FIELDS.sigOffice,
        copyFurnished: document.getElementById("tplFormCopyFurnished")?.value ?? STANDARD_ENDORSEMENT_TEMPLATE_FIELDS.copyFurnished
    };
    persistLocalSettingsCache();
    updateTemplateLivePreview();
}

function insertTemplateToken(token) {
    const target = activeTemplateInputField || document.getElementById("tplFormOpening");
    if (!target) return;
    const start = target.selectionStart ?? target.value.length;
    const end = target.selectionEnd ?? target.value.length;
    target.value = target.value.slice(0, start) + token + target.value.slice(end);
    target.focus();
    const nextPos = start + token.length;
    target.setSelectionRange(nextPos, nextPos);
    syncFormTemplateFields();
}

function loadOffDatesStorage() {
    let loaded = [];
    try {
        const raw = localStorage.getItem(OFF_DATES_STORAGE_KEY);
        if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) loaded = parsed;
        }
    } catch (e) {}
    AppState.toggledOffDates = Array.from(new Set(loaded.filter(d => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d)))).sort();
}

async function saveOffDatesStorage(syncCloud = true) {
    AppState.toggledOffDates = Array.from(new Set(AppState.toggledOffDates || [])).sort();
    try {
        localStorage.setItem(OFF_DATES_STORAGE_KEY, JSON.stringify(AppState.toggledOffDates));
    } catch (e) {}
    renderSavedOffDatesSummary();
    if (syncCloud) {
        try {
            await fetchWithRetry(APPS_SCRIPT_URL, {
                method: "POST",
                headers: { "Content-Type": "text/plain;charset=utf-8" },
                body: JSON.stringify({ action: "saveOffDates", offDates: AppState.toggledOffDates })
            }, 2);
        } catch (e) {}
    }
}

async function fetchOffDatesFromCloud() {
    try {
        const resp = await fetch(APPS_SCRIPT_URL + "?action=getOffDates&t=" + Date.now(), { mode: 'cors' });
        if (!resp.ok) return;
        const result = await resp.json();
        if (Array.isArray(result)) {
            const merged = Array.from(new Set([...AppState.toggledOffDates, ...result.filter(d => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d))])).sort();
            AppState.toggledOffDates = merged;
            localStorage.setItem(OFF_DATES_STORAGE_KEY, JSON.stringify(AppState.toggledOffDates));
            renderCalcCalendar();
            renderSavedOffDatesSummary();
        }
    } catch (e) {}
}

function setCalcDateValue(isoStr) {
    const cleanIso = /^\d{4}-\d{2}-\d{2}$/.test(isoStr) ? isoStr : getTodayISO();
    const hiddenEl = document.getElementById('calcStartDate');
    const displayEl = document.getElementById('calcStartDateDisplay');
    if (hiddenEl) hiddenEl.value = cleanIso;
    if (displayEl) displayEl.value = isoToMMDDYYYY(cleanIso);
}

function toggleCalcSystemDatePicker() {
    const popup = document.getElementById('calcSystemDatePickerPopup');
    if (!popup) return;
    if (!popup.classList.contains('hidden')) {
        popup.classList.add('hidden');
        return;
    }
    const currentIso = document.getElementById('calcStartDate')?.value || getTodayISO();
    const parts = currentIso.split('-');
    if (parts.length === 3) {
        pickerViewYear = parseInt(parts[0], 10);
        pickerViewMonth = parseInt(parts[1], 10) - 1;
    }
    renderSystemDatePickerGrid();
    popup.classList.remove('hidden');
}

function closeCalcSystemDatePicker() {
    const popup = document.getElementById('calcSystemDatePickerPopup');
    if (popup) popup.classList.add('hidden');
}

function changePickerMonth(dir) {
    pickerViewMonth += dir;
    if (pickerViewMonth > 11) { pickerViewMonth = 0; pickerViewYear++; }
    if (pickerViewMonth < 0) { pickerViewMonth = 11; pickerViewYear--; }
    renderSystemDatePickerGrid();
}

function selectCalcPickerToday() {
    const todayIso = getTodayISO();
    setCalcDateValue(todayIso);
    closeCalcSystemDatePicker();
    runWorkdayCalculator();
}

function pickSystemDate(isoStr) {
    setCalcDateValue(isoStr);
    closeCalcSystemDatePicker();
    runWorkdayCalculator();
}

function renderSystemDatePickerGrid() {
    const grid = document.getElementById('pickerCalendarDays');
    const label = document.getElementById('pickerMonthYearLabel');
    if (!grid || !label) return;

    const monthsNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    label.textContent = `${monthsNames[pickerViewMonth]} ${pickerViewYear}`;

    const selectedIso = document.getElementById('calcStartDate')?.value || '';
    const todayIso = getTodayISO();

    let html = ["S", "M", "T", "W", "T", "F", "S"].map(d =>
        `<div class="text-[10px] font-extrabold text-slate-500 py-1">${d}</div>`
    ).join('');

    const firstDay = new Date(pickerViewYear, pickerViewMonth, 1).getDay();
    const totalDays = new Date(pickerViewYear, pickerViewMonth + 1, 0).getDate();

    for (let i = 0; i < firstDay; i++) {
        html += `<div></div>`;
    }

    for (let day = 1; day <= totalDays; day++) {
        const iso = `${pickerViewYear}-${String(pickerViewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const isSelected = iso === selectedIso;
        const isToday = iso === todayIso;

        let btnClass = "bg-slate-950 text-slate-200 border border-slate-800 hover:border-sky-500";
        if (isSelected) {
            btnClass = "bg-blue-600 text-white border border-blue-400 shadow";
        } else if (isToday) {
            btnClass += " ring-1 ring-amber-400";
        }

        html += `<button type="button" onclick="pickSystemDate('${iso}')" class="p-1.5 rounded-lg text-[11px] font-mono font-bold transition ${btnClass}">${day}</button>`;
    }

    grid.innerHTML = html;
}

document.addEventListener('click', (e) => {
    const popup = document.getElementById('calcSystemDatePickerPopup');
    const displayEl = document.getElementById('calcStartDateDisplay');
    if (popup && !popup.classList.contains('hidden')) {
        const clickedInsidePopup = popup.contains(e.target);
        const clickedDisplay = displayEl && displayEl.contains(e.target);
        const clickedPickerTrigger = e.target.closest && e.target.closest('[onclick*="toggleCalcSystemDatePicker"]');
        if (!clickedInsidePopup && !clickedDisplay && !clickedPickerTrigger) {
            popup.classList.add('hidden');
        }
    }
});

function openNativeDatePicker(inputEl) {
    if (!inputEl) return;
    try {
        if (typeof inputEl.showPicker === 'function') {
            inputEl.showPicker();
        }
    } catch (e) {}
}

let globalPickerTargetId = null;
let globalPickerViewYear = 2026;
let globalPickerViewMonth = 10;

function setSystemDateInputValue(inputId, isoStr) {
    const cleanIso = (isoStr && /^\d{4}-\d{2}-\d{2}$/.test(isoStr)) ? isoStr : '';
    const hiddenEl = document.getElementById(inputId);
    const displayEl = document.getElementById(inputId + 'Display');
    if (hiddenEl) hiddenEl.value = cleanIso;
    if (displayEl) displayEl.value = cleanIso ? isoToMMDDYYYY(cleanIso) : '';
}

function openSystemDatePicker(targetInputId, anchorEl) {
    const popup = document.getElementById('globalSystemDatePickerPopup');
    if (!popup) return;

    if (!popup.classList.contains('hidden') && globalPickerTargetId === targetInputId) {
        popup.classList.add('hidden');
        globalPickerTargetId = null;
        return;
    }

    globalPickerTargetId = targetInputId;
    const currentIso = document.getElementById(targetInputId)?.value || getTodayISO();
    const parts = currentIso.split('-');
    if (parts.length === 3) {
        globalPickerViewYear = parseInt(parts[0], 10);
        globalPickerViewMonth = parseInt(parts[1], 10) - 1;
    }

    const clearBtn = document.getElementById('btnGlobalPickerClear');
    if (clearBtn) {
        clearBtn.style.display = (targetInputId === 'filterDate') ? 'inline-block' : 'none';
    }

    renderGlobalSystemDatePickerGrid();
    popup.classList.remove('hidden');

    const refEl = anchorEl || document.getElementById(targetInputId + 'Display');
    if (refEl && refEl.getBoundingClientRect) {
        const rect = refEl.getBoundingClientRect();
        const popupW = 288;
        const popupH = 290;
        let left = rect.left;
        let top = rect.bottom + 6;
        if (left + popupW > window.innerWidth - 12) left = Math.max(12, window.innerWidth - popupW - 12);
        if (top + popupH > window.innerHeight - 12) top = Math.max(12, rect.top - popupH - 6);
        popup.style.left = left + 'px';
        popup.style.top = top + 'px';
    }
}

function closeGlobalSystemDatePicker() {
    const popup = document.getElementById('globalSystemDatePickerPopup');
    if (popup) popup.classList.add('hidden');
    globalPickerTargetId = null;
}

function changeGlobalPickerMonth(dir) {
    globalPickerViewMonth += dir;
    if (globalPickerViewMonth > 11) { globalPickerViewMonth = 0; globalPickerViewYear++; }
    if (globalPickerViewMonth < 0) { globalPickerViewMonth = 11; globalPickerViewYear--; }
    renderGlobalSystemDatePickerGrid();
}

function pickGlobalSystemDate(isoStr) {
    if (!globalPickerTargetId) return;
    const targetEl = document.getElementById(globalPickerTargetId);
    setSystemDateInputValue(globalPickerTargetId, isoStr);
    closeGlobalSystemDatePicker();
    if (targetEl && typeof targetEl.onchange === 'function') {
        targetEl.onchange();
    } else if (targetEl) {
        targetEl.dispatchEvent(new Event('change'));
    }
}

function selectGlobalPickerToday() {
    pickGlobalSystemDate(getTodayISO());
}

function clearGlobalPickerDate() {
    if (!globalPickerTargetId) return;
    const targetEl = document.getElementById(globalPickerTargetId);
    setSystemDateInputValue(globalPickerTargetId, '');
    closeGlobalSystemDatePicker();
    if (targetEl && typeof targetEl.onchange === 'function') {
        targetEl.onchange();
    } else if (targetEl) {
        targetEl.dispatchEvent(new Event('change'));
    }
}

function renderGlobalSystemDatePickerGrid() {
    const grid = document.getElementById('globalPickerCalendarDays');
    const label = document.getElementById('globalPickerMonthYearLabel');
    if (!grid || !label) return;

    const monthsNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    label.textContent = `${monthsNames[globalPickerViewMonth]} ${globalPickerViewYear}`;

    const selectedIso = globalPickerTargetId ? (document.getElementById(globalPickerTargetId)?.value || '') : '';
    const todayIso = getTodayISO();

    let html = ["S", "M", "T", "W", "T", "F", "S"].map(d =>
        `<div class="text-[10px] font-extrabold text-slate-500 py-1">${d}</div>`
    ).join('');

    const firstDay = new Date(globalPickerViewYear, globalPickerViewMonth, 1).getDay();
    const totalDays = new Date(globalPickerViewYear, globalPickerViewMonth + 1, 0).getDate();

    for (let i = 0; i < firstDay; i++) {
        html += `<div></div>`;
    }

    for (let day = 1; day <= totalDays; day++) {
        const iso = `${globalPickerViewYear}-${String(globalPickerViewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const isSelected = iso === selectedIso;
        const isToday = iso === todayIso;

        let btnClass = "bg-slate-950 text-slate-200 border border-slate-800 hover:border-sky-500";
        if (isSelected) {
            btnClass = "bg-blue-600 text-white border border-blue-400 shadow";
        } else if (isToday) {
            btnClass += " ring-1 ring-amber-400";
        }

        html += `<button type="button" onclick="pickGlobalSystemDate('${iso}')" class="p-1.5 rounded-lg text-[11px] font-mono font-bold transition ${btnClass}">${day}</button>`;
    }

    grid.innerHTML = html;
}

document.addEventListener('click', (e) => {
    const gPopup = document.getElementById('globalSystemDatePickerPopup');
    if (gPopup && !gPopup.classList.contains('hidden')) {
        const inside = gPopup.contains(e.target);
        const onTrigger = e.target.closest && e.target.closest('[onclick*="openSystemDatePicker"]');
        if (!inside && !onTrigger) {
            closeGlobalSystemDatePicker();
        }
    }
});

function mergeSettingsSafely(localOrDefaultSettings, incomingSettings, preferIncomingCategories = false) {
    const base = localOrDefaultSettings || {};
    const inc = (incomingSettings && typeof incomingSettings === "object") ? incomingSettings : {};

    const mergedGroups = {};
    const hasIncomingGroups = inc.categoryGroups && typeof inc.categoryGroups === "object" && Object.keys(inc.categoryGroups).length > 0;

    CATEGORY_GROUPS.forEach(grp => {
        const localArr = Array.isArray(base.categoryGroups?.[grp]) ? base.categoryGroups[grp] : [];
        const incArr = Array.isArray(inc.categoryGroups?.[grp]) ? inc.categoryGroups[grp] : [];
        const chosen = (preferIncomingCategories && hasIncomingGroups)
            ? incArr
            : (hasIncomingGroups ? Array.from(new Set([...localArr, ...incArr])) : localArr);
        mergedGroups[grp] = Array.from(new Set(chosen.map(x => String(x || '').trim()).filter(Boolean)));
    });

    const mergedPlatforms = Array.isArray(inc.platforms) && inc.platforms.length > 0
        ? inc.platforms
        : (base.platforms || AppState.settings.platforms);

    const mergedTicketTypes = Array.isArray(inc.ticketTypes) && inc.ticketTypes.length > 0
        ? inc.ticketTypes
        : (base.ticketTypes || AppState.settings.ticketTypes);

    const requiredDefaultAction = "Waiting for further information /documents needed from the client";
    const rawActionsTaken = Array.isArray(inc.actionsTaken) && inc.actionsTaken.length > 0
        ? inc.actionsTaken
        : (base.actionsTaken || AppState.settings.actionsTaken || []);
    const mergedActionsTaken = Array.from(new Set([...rawActionsTaken, requiredDefaultAction]));

    const mergedStatuses = Array.isArray(inc.statuses) && inc.statuses.length > 0
        ? inc.statuses
        : (base.statuses || AppState.settings.statuses);

    const mergedReportCfg = {
        ...(base.reportConfig || {}),
        ...(inc.reportConfig || {})
    };
    if (!mergedReportCfg.logo1Url && base.reportConfig?.logo1Url) mergedReportCfg.logo1Url = base.reportConfig.logo1Url;
    if (!mergedReportCfg.logo2Url && base.reportConfig?.logo2Url) mergedReportCfg.logo2Url = base.reportConfig.logo2Url;
    if (!mergedReportCfg.logo3Url && base.reportConfig?.logo3Url) mergedReportCfg.logo3Url = base.reportConfig.logo3Url;

    const enableClipboard = inc.enableResponderClipboard !== undefined
        ? !!inc.enableResponderClipboard
        : (base.enableResponderClipboard !== undefined ? !!base.enableResponderClipboard : true);

    const mergedColumnLabels = {
        ...DEFAULT_CUSTOM_COLUMN_LABELS,
        ...(base.columnLabels || {}),
        ...(inc.columnLabels || {})
    };

    const out = {
        ...base,
        ...inc,
        enableResponderClipboard: enableClipboard,
        columnLabels: mergedColumnLabels,
        categoryGroups: mergedGroups,
        platforms: mergedPlatforms,
        ticketTypes: mergedTicketTypes,
        actionsTaken: mergedActionsTaken,
        statuses: mergedStatuses,
        endorsementForm: {
            ...(base.endorsementForm || STANDARD_ENDORSEMENT_TEMPLATE_FIELDS),
            ...(inc.endorsementForm || {})
        },
        reportConfig: mergedReportCfg
    };

    const flatCats = [];
    CATEGORY_GROUPS.forEach(grp => {
        (out.categoryGroups[grp] || []).forEach(c => {
            if (c && !flatCats.some(x => x.toLowerCase() === c.toLowerCase())) {
                flatCats.push(c);
            }
        });
    });
    out.categories = flatCats;
    return out;
}

function persistLocalSettingsCache() {
    ensureCategoryGroupsInitialized();
    getCustomColumnLabels();
    try {
        localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(AppState.settings));
        localStorage.setItem(COLUMN_LABELS_STORAGE_KEY, JSON.stringify(AppState.settings.columnLabels));
    } catch (e) {}
}

function loadLocalSettingsCache() {
    try {
        const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
        if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed && typeof parsed === "object") {
                AppState.settings = mergeSettingsSafely(AppState.settings, parsed, true);
            }
        }
        const rawCols = localStorage.getItem(COLUMN_LABELS_STORAGE_KEY);
        if (rawCols) {
            const parsedCols = JSON.parse(rawCols);
            if (parsedCols && typeof parsedCols === "object") {
                AppState.settings.columnLabels = {
                    ...DEFAULT_CUSTOM_COLUMN_LABELS,
                    ...(AppState.settings.columnLabels || {}),
                    ...parsedCols
                };
            }
        }
    } catch (e) {}
    ensureCategoryGroupsInitialized();
    getCustomColumnLabels();
}

function ensureCategoryGroupsInitialized() {
    if (!AppState.settings.categoryGroups || typeof AppState.settings.categoryGroups !== "object") {
        AppState.settings.categoryGroups = {};
    }
    CATEGORY_GROUPS.forEach(grp => {
        if (!Array.isArray(AppState.settings.categoryGroups[grp])) {
            AppState.settings.categoryGroups[grp] = [];
        }
        AppState.settings.categoryGroups[grp] = Array.from(
            new Set(AppState.settings.categoryGroups[grp].map(c => String(c || '').trim()).filter(Boolean))
        );
    });

    syncFlatCategoriesFromGroups();
}

function syncFlatCategoriesFromGroups() {
    const flat = [];
    CATEGORY_GROUPS.forEach(grp => {
        (AppState.settings.categoryGroups[grp] || []).forEach(c => {
            const clean = String(c || '').trim();
            if (clean && !flat.some(existing => existing.toLowerCase() === clean.toLowerCase())) {
                flat.push(clean);
            }
        });
    });
    AppState.settings.categories = flat;
}

function getGroupForCategory(categoryName) {
    ensureCategoryGroupsInitialized();
    const target = String(categoryName || '').trim().toLowerCase();
    if (!target) return "Other concerns";
    for (const grp of CATEGORY_GROUPS) {
        const list = AppState.settings.categoryGroups[grp] || [];
        if (list.some(item => String(item).trim().toLowerCase() === target)) {
            return grp;
        }
    }
    return "Other concerns";
}

function showSystemAlert(title, message, icon = "⚠️") {
    const modal = document.getElementById('systemModal');
    if (!modal) return;
    document.getElementById('systemModalTitleText').textContent = title;
    document.getElementById('systemModalIcon').textContent = icon;
    document.getElementById('systemModalMessage').textContent = message;
    document.getElementById('systemModalButtons').innerHTML = `
        <button type="button" onclick="closeSystemModal()" class="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded shadow">OK</button>
    `;
    modal.style.display = 'flex';
}

function showSystemConfirm(title, message, onConfirm, icon = "❓") {
    const modal = document.getElementById('systemModal');
    if (!modal) return;
    document.getElementById('systemModalTitleText').textContent = title;
    document.getElementById('systemModalIcon').textContent = icon;
    document.getElementById('systemModalMessage').textContent = message;
    document.getElementById('systemModalButtons').innerHTML = `
        <button type="button" onclick="closeSystemModal()" class="px-4 py-2 text-xs text-slate-300 bg-slate-800 hover:bg-slate-700 rounded font-semibold">Cancel</button>
        <button type="button" id="systemConfirmYesBtn" class="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 rounded shadow">Confirm</button>
    `;
    document.getElementById('systemConfirmYesBtn').onclick = () => {
        closeSystemModal();
        if (onConfirm) onConfirm();
    };
    modal.style.display = 'flex';
}

function closeSystemModal() {
    const modal = document.getElementById('systemModal');
    if (modal) modal.style.display = 'none';
}

function showToast(msg) {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = 'bg-slate-800 text-slate-100 border border-slate-700 text-xs px-3.5 py-2 rounded-lg shadow-xl flex items-center gap-2';
    toast.innerHTML = `<span>✨</span> <span>${escapeHtml(msg)}</span>`;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 2500);
}

function executeSystemLogout() {
    persistLocalSettingsCache();
    saveOffDatesStorage(false);
    sessionStorage.clear();
    localStorage.removeItem('LTO_ACTIVE_USER');
    window.location.href = 'login.html';
}

function getTodayISO() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function getTodayMMDDYYYY() {
    const now = new Date();
    return `${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')}/${now.getFullYear()}`;
}

function isoToMMDDYYYY(isoStr) {
    if (!isoStr) return '';
    if (isoStr.includes('/')) return isoStr;
    const parts = isoStr.split('-');
    if (parts.length === 3) return `${parts[1].padStart(2, '0')}/${parts[2].padStart(2, '0')}/${parts[0]}`;
    return isoStr;
}

function mmddyyyyToISO(mdyStr) {
    if (!mdyStr) return getTodayISO();
    if (mdyStr.includes('-') && mdyStr.length === 10) return mdyStr;
    const parts = mdyStr.split('/');
    if (parts.length === 3) return `${parts[2]}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`;
    return getTodayISO();
}

function formatCleanDate(val) {
    if (!val) return '';
    const str = String(val).replace(/^'/, '').trim();
    if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(str)) {
        const p = str.split('/');
        return `${p[0].padStart(2, '0')}/${p[1].padStart(2, '0')}/${p[2]}`;
    }
    if (str.includes('GMT') || str.includes('Standard') || (str.includes('T') && !isNaN(Date.parse(str)))) {
        const d = new Date(str);
        if (!isNaN(d.getTime())) return `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}/${d.getFullYear()}`;
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return isoToMMDDYYYY(str);
    return str;
}

function setFilterDateToday() {
    setSystemDateInputValue('filterDate', getTodayISO()); renderTable();
}

function clearDateFilter() {
    setSystemDateInputValue('filterDate', ''); renderTable();
}

function setFormDateToday() {
    setSystemDateInputValue('formDateReceived', getTodayISO());
    autoGenTicketNo(false);
}

function getNormalizedRole() {
    return String(currentUser?.role || "").trim().toLowerCase();
}

function isSuperAdmin() { return getNormalizedRole() === "super admin"; }
function isAdminSV() { return getNormalizedRole() === "adminsv"; }
function isAdminTL() { return getNormalizedRole() === "admintl" || isSuperAdmin(); }
function canViewSupervisorStats() { return isAdminSV() || isAdminTL() || isSuperAdmin(); }
function canUserGenerateReports() { return isSuperAdmin() || isAdminTL() || (currentUser && currentUser.canReports === true); }
function canUserDeleteLogs() { return isSuperAdmin() || isAdminTL() || (currentUser && currentUser.canDeleteLogs === true); }
function canUserManageUsers() { return isSuperAdmin() || (currentUser && currentUser.canManageUsers === true); }
function canUserAccessSettings() { return isSuperAdmin() || isAdminTL() || (currentUser && currentUser.canAccessSettings === true); }
function canUserEditWorkdayOffDates() { return isSuperAdmin() || isAdminTL(); }
function isResponderClipboardEnabled() { return AppState.settings?.enableResponderClipboard !== false; }

function isTicketOwnedByCurrentUser(ticket) {
    if (!ticket || !currentUser) return false;
    const myAdminNo = String(currentUser.adminNo || deriveOperatorAdminNo(currentUser) || "").trim().toLowerCase();
    const myName = String(currentUser.name || "").trim().toLowerCase();
    const myUsername = String(currentUser.username || "").trim().toLowerCase();
    const tAdmin = String(ticket.adminNo || "").trim().toLowerCase();
    const tCreatedBy = String(ticket.extraData?.createdByUsername || "").trim().toLowerCase();

    if (tCreatedBy && myUsername && tCreatedBy === myUsername) return true;
    if (tAdmin && myAdminNo && tAdmin === myAdminNo) return true;
    if (tAdmin && myName && tAdmin === myName) return true;
    if (tAdmin && myUsername && tAdmin === myUsername) return true;
    return false;
}

function canEditOrDeleteTicket(ticket) {
    if (isSuperAdmin() || isAdminTL()) return true;
    if (isAdminSV()) return false;
    return isTicketOwnedByCurrentUser(ticket);
}

function updateUIPrivileges() {
    const btnReports = document.getElementById('tabBtnReports');
    const btnSupervisor = document.getElementById('tabBtnSupervisor');
    const btnDirectory = document.getElementById('tabBtnDirectory');
    const btnTemplate = document.getElementById('tabBtnTemplate');
    const btnUsers = document.getElementById('tabBtnUsers');
    const btnSettings = document.getElementById('tabBtnSettings');
    const btnClipboard = document.getElementById('tabBtnClipboard');
    const btnAccomplishment = document.getElementById('tabBtnAccomplishment');
    const btnBackendSheet = document.getElementById('btnOpenBackendSheet');
    if (btnBackendSheet) btnBackendSheet.style.display = isSuperAdmin() ? 'inline-flex' : 'none';

    const hasSupervisorAccess = canViewSupervisorStats();
    const hasReportAccess = canUserGenerateReports();
    const hasDirectoryAccess = isAdminTL() || isSuperAdmin();
    const hasTemplateAccess = isAdminTL() || isSuperAdmin();
    const hasUserAccess = canUserManageUsers();
    const hasSettingsAccess = canUserAccessSettings();
    const clipboardEnabled = isResponderClipboardEnabled();

    const canEditOffDates = canUserEditWorkdayOffDates();
    if (!canEditOffDates && !hasReportAccess && !hasDirectoryAccess && !hasTemplateAccess && !hasUserAccess && !hasSettingsAccess) {
        document.body.classList.add('role-normal-admin');
    } else if (!canEditOffDates) {
        document.body.classList.add('role-normal-admin');
    } else {
        document.body.classList.remove('role-normal-admin');
    }

    const btnResetOffDates = document.getElementById('btnResetOffDates');
    if (btnResetOffDates) btnResetOffDates.style.display = canEditOffDates ? 'inline-flex' : 'none';
    const offDatesHint = document.getElementById('offDatesToggleHint');
    if (offDatesHint) {
        offDatesHint.textContent = canEditOffDates
            ? 'Click calendar days to toggle On/Off'
            : 'View-only schedule (AdminTL / Super Admin only)';
    }

    if (btnSupervisor) btnSupervisor.style.display = hasSupervisorAccess ? 'flex' : 'none';
    if (btnAccomplishment) btnAccomplishment.style.display = 'flex';
    if (btnClipboard) {
        btnClipboard.style.display = clipboardEnabled ? 'flex' : 'none';
        if (!clipboardEnabled) {
            const clipView = document.getElementById('viewClipboard');
            if (clipView && clipView.style.display !== 'none') {
                switchMainTab('logs');
            }
        }
    }

    const clipToggleEl = document.getElementById('cfgEnableResponderClipboard');
    const clipStatusEl = document.getElementById('cfgResponderClipboardStatusLabel');
    if (clipToggleEl) clipToggleEl.checked = clipboardEnabled;
    if (clipStatusEl) {
        clipStatusEl.textContent = clipboardEnabled ? 'ENABLED' : 'DISABLED (OFF)';
        clipStatusEl.className = clipboardEnabled
            ? 'ml-2.5 text-xs font-extrabold text-emerald-400 uppercase'
            : 'ml-2.5 text-xs font-extrabold text-rose-400 uppercase';
    }

    if (btnReports) btnReports.style.display = hasReportAccess ? 'flex' : 'none';
    if (btnDirectory) btnDirectory.style.display = hasDirectoryAccess ? 'flex' : 'none';
    if (btnTemplate) btnTemplate.style.display = hasTemplateAccess ? 'flex' : 'none';
    if (btnUsers) btnUsers.style.display = hasUserAccess ? 'flex' : 'none';
    if (btnSettings) btnSettings.style.display = hasSettingsAccess ? 'flex' : 'none';

    const btnDelDateLogs = document.getElementById('btnDeleteDateLogs');
    if (btnDelDateLogs) {
        btnDelDateLogs.style.display = (isSuperAdmin() || isAdminTL()) ? 'inline-flex' : 'none';
    }
}

function toggleGlobalResponderClipboard(enabled) {
    AppState.settings.enableResponderClipboard = !!enabled;
    persistLocalSettingsCache();
    updateUIPrivileges();
    saveAllSettingsToCloud(true);
    showToast(enabled ? "Responder Clipboard enabled for all users." : "Responder Clipboard turned OFF for all users.");
}

function loadPendingSyncQueue() {
    try {
        const raw = localStorage.getItem(PENDING_SYNC_QUEUE_KEY);
        if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) return parsed;
        }
    } catch (e) {}
    return [];
}

function savePendingSyncQueue(queue) {
    try {
        localStorage.setItem(PENDING_SYNC_QUEUE_KEY, JSON.stringify(queue || []));
    } catch (e) {}
    updateSyncStatusBadge();
}

function enqueuePendingTicketSync(ticketObj, isEditing, targetRowIdx) {
    const queue = loadPendingSyncQueue();
    const clientKey = `${String(ticketObj.referralNo || '').trim().toLowerCase()}|${String(ticketObj.dateReceived || '').trim()}|${String(ticketObj.complainantName || '').trim().toLowerCase()}`;
    const existingIdx = queue.findIndex(item => item.clientKey === clientKey);
    const entry = {
        clientKey,
        ticketObj: { ...ticketObj },
        isEditing: !!isEditing,
        targetRowIdx: targetRowIdx || null,
        updatedAt: Date.now()
    };
    if (existingIdx >= 0) {
        queue[existingIdx] = entry;
    } else {
        queue.push(entry);
    }
    savePendingSyncQueue(queue);
    flushPendingSyncQueue(true);
}

function removePendingTicketSync(clientKey) {
    const queue = loadPendingSyncQueue().filter(item => item.clientKey !== clientKey);
    savePendingSyncQueue(queue);
}

function mergeQueuedTicketsIntoList(ticketList) {
    const queue = loadPendingSyncQueue();
    if (!queue.length) return ticketList;

    const merged = [...ticketList];
    queue.forEach(qItem => {
        const t = qItem.ticketObj;
        if (!t) return;
        const idx = merged.findIndex(item =>
            String(item.referralNo || '').trim().toLowerCase() === String(t.referralNo || '').trim().toLowerCase() &&
            String(item.dateReceived || '').trim() === String(t.dateReceived || '').trim()
        );
        if (idx >= 0) {
            merged[idx] = { ...merged[idx], ...t };
        } else {
            merged.push({ ...t });
        }
    });
    return merged;
}

async function flushPendingSyncQueue(silent = true) {
    if (isFlushingSyncQueue || isSavingTicket) return;
    const queue = loadPendingSyncQueue();
    if (!queue.length) {
        updateSyncStatusBadge("synced");
        return;
    }

    isFlushingSyncQueue = true;
    updateSyncStatusBadge("syncing");
    try {
        for (const qItem of queue) {
            const storageKey = qItem.isEditing ? LAST_WORKING_UPDATE_ACTION_KEY : LAST_WORKING_ADD_ACTION_KEY;
            const cachedAction = localStorage.getItem(storageKey);
            const actionCandidates = Array.from(new Set(
                (qItem.isEditing
                    ? [cachedAction, "updateLog", "updateTicket", "update", "editLog", "edit", "saveLog", "save"]
                    : [cachedAction, "addLog", "addTicket", "createLog", "createTicket", "create", "add", "insert", "append", "saveLog", "save"]
                ).filter(Boolean)
            ));

            for (const act of actionCandidates) {
                try {
                    const { resData, errMsg } = await sendTicketPayloadToAppsScript(act, qItem.targetRowIdx, qItem.ticketObj);
                    if (!errMsg) {
                        localStorage.setItem(storageKey, act);
                        removePendingTicketSync(qItem.clientKey);
                        const savedIdx = AppState.tickets.findIndex(item =>
                            String(item.referralNo || '').trim().toLowerCase() === String(qItem.ticketObj.referralNo || '').trim().toLowerCase()
                        );
                        if (savedIdx >= 0 && resData && resData.rowIndex) {
                            AppState.tickets[savedIdx].rowIndex = resData.rowIndex;
                            saveStorage();
                        }
                        if (!silent) {
                            showToast(`Queued entry ${qItem.ticketObj.referralNo} synchronized with Google Sheets.`);
                        }
                        break;
                    }
                    if (!isUnknownActionErrorMessage(errMsg)) {
                        break;
                    }
                } catch (e) {}
            }
        }
    } finally {
        isFlushingSyncQueue = false;
        updateSyncStatusBadge(loadPendingSyncQueue().length > 0 ? "queued" : "synced");
    }
}

async function pollRealtimeUpdates() {
    if (isSavingTicket || isFlushingSyncQueue) return;
    if (loadPendingSyncQueue().length > 0) return;

    const ticketModalOpen = document.getElementById('ticketModal')?.style.display === 'flex';
    const userModalOpen = document.getElementById('userModal')?.style.display === 'flex';
    const endorseModalOpen = document.getElementById('endorseModal')?.style.display === 'flex';
    const dupModalOpen = document.getElementById('duplicateWarningModal')?.style.display === 'flex';
    if (ticketModalOpen || userModalOpen || endorseModalOpen || dupModalOpen) return;

    try {
        const [logsResp, usersResp, settingsResp] = await Promise.all([
            fetch(APPS_SCRIPT_URL + "?t=" + Date.now(), { mode: 'cors' }),
            fetch(APPS_SCRIPT_URL + "?action=getUsers&t=" + Date.now(), { mode: 'cors' }),
            fetch(APPS_SCRIPT_URL + "?action=getSettings&t=" + Date.now(), { mode: 'cors' })
        ]);

        let changed = false;

        if (usersResp && usersResp.ok) {
            const usersResult = await usersResp.json();
            if (Array.isArray(usersResult) && usersResult.length > 0) {
                const prevUsersJson = JSON.stringify(AppState.users);
                const nextUsersJson = JSON.stringify(usersResult);
                if (prevUsersJson !== nextUsersJson) {
                    AppState.users = usersResult;
                    localStorage.setItem('LTO_CPAO_USERS_2026', JSON.stringify(AppState.users));
                    renderUsersTable();
                    checkScheduledPortalAssignment();
                    changed = true;
                }
            }
        }

        if (settingsResp && settingsResp.ok) {
            const settingsResult = await settingsResp.json();
            const cloudSettings = (settingsResult && typeof settingsResult === "object" && settingsResult.settings && typeof settingsResult.settings === "object")
                ? settingsResult.settings
                : settingsResult;
            if (cloudSettings && typeof cloudSettings === "object" && (cloudSettings.categories || cloudSettings.categoryGroups || cloudSettings.platforms || cloudSettings.columnLabels || cloudSettings.endorsementForm || cloudSettings.reportConfig)) {
                const prevSettingsJson = JSON.stringify(AppState.settings);
                AppState.settings = mergeSettingsSafely(AppState.settings, cloudSettings, true);
                if (JSON.stringify(AppState.settings) !== prevSettingsJson) {
                    persistLocalSettingsCache();
                    populateDropdowns();
                    renderSettingsTables();
                    renderCustomColumnLabelsEditor();
                    updateUIPrivileges();
                    changed = true;
                }
            }
        }

        if (logsResp && logsResp.ok && !isSavingTicket && loadPendingSyncQueue().length === 0) {
            const logsResult = await logsResp.json();
            if (Array.isArray(logsResult)) {
                const validRows = logsResult.filter(item => !String(item.rowIndex || item['#'] || '').toUpperCase().startsWith('DATE:'));
                const normalizedCloud = mergeQueuedTicketsIntoList(
                    validRows.map((item, idx) => normalizeTicketObject(item, idx))
                );

                const currentJson = JSON.stringify(AppState.tickets.map(t => ({
                    ref: t.referralNo,
                    status: t.status,
                    cat: t.category,
                    details: t.ticketDetails,
                    resp: t.responseDetails,
                    remarks: t.remarks,
                    action: t.actionTaken
                })));
                const cloudJson = JSON.stringify(normalizedCloud.map(t => ({
                    ref: t.referralNo,
                    status: t.status,
                    cat: t.category,
                    details: t.ticketDetails,
                    resp: t.responseDetails,
                    remarks: t.remarks,
                    action: t.actionTaken
                })));

                if (currentJson !== cloudJson) {
                    AppState.tickets = normalizedCloud;
                    saveStorage();
                    changed = true;
                }
            }
        }

        if (changed) {
            renderTable();
            updateKPIs();
            if (document.getElementById('viewSupervisor')?.style.display !== 'none') {
                renderSupervisorStatistics();
            }
            if (document.getElementById('viewReports')?.style.display !== 'none' && document.getElementById('repStartDate')?.value && document.getElementById('repEndDate')?.value) {
                generateReport();
            }
            if (document.getElementById('viewAccomplishment')?.style.display !== 'none') {
                generateAccomplishmentReport();
            }
        }
        updateSyncStatusBadge("synced");
    } catch (e) {
        console.warn("Realtime poll skipped:", e);
    }
}

function applyDefaultViewScopeForUser() {
    const scopeSel = document.getElementById('superadminViewScope');
    if (!scopeSel) return;
    if (!isSuperAdmin() && !isAdminTL() && !isAdminSV()) {
        scopeSel.value = 'my';
    } else if (isAdminSV() || isAdminTL() || isSuperAdmin()) {
        scopeSel.value = 'all';
    }
}

window.addEventListener('DOMContentLoaded', () => {
    try {
        localStorage.removeItem('LTO_ACTIVE_USER');
    } catch (e) {}

    let savedUser = null;
    try {
        const sUser = sessionStorage.getItem('LTO_ACTIVE_USER');
        if (sUser) savedUser = JSON.parse(sUser);
    } catch (e) {}

    if (!savedUser || !savedUser.username) {
        window.location.replace('login.html');
        return;
    }

    currentUser = {
        ...savedUser,
        adminNo: savedUser.adminNo || deriveOperatorAdminNo(savedUser)
    };

    const roleText = String(currentUser.role || 'Admin').toUpperCase();
    const badgeEl = document.getElementById('userRoleBadge');
    if (badgeEl) badgeEl.textContent = roleText;

    const opEl = document.getElementById('activeOperatorName');
    if (opEl) opEl.textContent = currentUser.name || currentUser.username || 'Admin';

    loadLocalSettingsCache();
    loadOffDatesStorage();
    loadCustomAccomplishments();

    try {
        const savedUsers = localStorage.getItem('LTO_CPAO_USERS_2026');
        if (savedUsers) {
            const parsedUsers = JSON.parse(savedUsers);
            if (Array.isArray(parsedUsers) && parsedUsers.length > 0) {
                AppState.users = parsedUsers;
            }
        }
    } catch (e) {}

    const matchedUser = AppState.users.find(u => String(u.username || '').toLowerCase() === String(currentUser.username || '').toLowerCase());
    if (matchedUser) {
        currentUser = {
            ...currentUser,
            ...matchedUser,
            adminNo: matchedUser.adminNo || currentUser.adminNo || deriveOperatorAdminNo(matchedUser)
        };
    }

    try {
        const cachedTickets = localStorage.getItem('LTO_CPAO_TICKETS_CACHE_2026');
        if (cachedTickets) {
            const parsedTickets = JSON.parse(cachedTickets);
            if (Array.isArray(parsedTickets)) {
                AppState.tickets = mergeQueuedTicketsIntoList(parsedTickets);
            }
        }
    } catch (e) {}

    updateUIPrivileges();
    applyDefaultViewScopeForUser();
    setSystemDateInputValue('filterDate', getTodayISO());
    setSystemDateInputValue('svRefDate', getTodayISO());
    populateDropdowns();
    renderTableHeadersAndColumns();
    renderCustomColumnLabelsEditor();
    renderTable();
    updateKPIs();
    renderUsersTable();
    renderSettingsTables();
    renderDirectoryTable();
    populateEndorsementFormInputs();
    updateTemplateLivePreview();
    renderSavedOffDatesSummary();
    setCalcDateValue(getTodayISO());
    runWorkdayCalculator();
    renderCalcCalendar();
    runWorkflow();
    renderClipboardSnippets();
    initAccomplishmentDefaults();
    setReportPreset('monthly');
    generateReport();
    renderSupervisorStatistics();

    // Immediate cloud sync + fast real-time sync loop (every 4 seconds)
    fetchAllCloudData(true);
    setInterval(() => {
        flushPendingSyncQueue(true);
        pollRealtimeUpdates();
    }, 4000);
});

async function fetchWithRetry(url, options = {}, retries = 2) {
    let lastErr = null;
    for (let i = 0; i <= retries; i++) {
        try {
            const resp = await fetch(url, options);
            if (!resp.ok) throw new Error("HTTP " + resp.status);
            return resp;
        } catch (err) {
            lastErr = err;
            if (i < retries) {
                await new Promise(r => setTimeout(r, 400 * (i + 1)));
            }
        }
    }
    throw lastErr || new Error("Network request failed");
}

function saveStorage() {
    try {
        localStorage.setItem('LTO_CPAO_TICKETS_CACHE_2026', JSON.stringify(AppState.tickets || []));
    } catch (e) {}
}

function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function switchMainTab(tabName) {
    const views = {
        logs: 'viewLogs',
        accomplishment: 'viewAccomplishment',
        supervisor: 'viewSupervisor',
        reports: 'viewReports',
        workflow: 'viewWorkflow',
        clipboard: 'viewClipboard',
        workday: 'viewWorkday',
        directory: 'viewDirectory',
        directoryOfficials: 'viewDirectoryOfficials',
        template: 'viewTemplate',
        users: 'viewUsers',
        settings: 'viewSettings'
    };

    if (tabName === 'supervisor' && !canViewSupervisorStats()) {
        showSystemAlert("Access Denied", "Only Supervisor (AdminSV), AdminTL, and Super Admin can access Supervisor Statistics.", "🔒");
        return;
    }
    if (tabName === 'reports' && !canUserGenerateReports()) {
        showSystemAlert("Access Denied", "You do not have permission to access Reports Generator.", "🔒");
        return;
    }
    if ((tabName === 'directory' || tabName === 'directoryOfficials') && !isAdminTL() && !isSuperAdmin()) {
        showSystemAlert("Access Denied", "Only AdminTL and Super Admin can access LTO Directory.", "🔒");
        return;
    }
    if (tabName === 'template' && !isAdminTL() && !isSuperAdmin()) {
        showSystemAlert("Access Denied", "Only AdminTL and Super Admin can access Endorsement Template.", "🔒");
        return;
    }
    if (tabName === 'users' && !canUserManageUsers()) {
        showSystemAlert("Access Denied", "You do not have permission to manage User Accounts.", "🔒");
        return;
    }
    if (tabName === 'settings' && !canUserAccessSettings()) {
        showSystemAlert("Access Denied", "You do not have permission to access System Settings.", "🔒");
        return;
    }
    if (tabName === 'clipboard' && !isResponderClipboardEnabled()) {
        showSystemAlert("Feature Disabled", "Responder Clipboard has been turned OFF by Super Admin.", "💬");
        return;
    }

    Object.keys(views).forEach(k => {
        const el = document.getElementById(views[k]);
        if (el) {
            el.classList.add('hidden');
            el.classList.remove('flex');
            el.style.display = 'none';
        }
    });

    const tabBtns = {
        logs: 'tabBtnLogs',
        accomplishment: 'tabBtnAccomplishment',
        supervisor: 'tabBtnSupervisor',
        reports: 'tabBtnReports',
        workflow: 'tabBtnWorkflow',
        clipboard: 'tabBtnClipboard',
        workday: 'tabBtnWorkday',
        directory: 'tabBtnDirectory',
        directoryOfficials: 'tabBtnDirectory',
        template: 'tabBtnTemplate',
        users: 'tabBtnUsers',
        settings: 'tabBtnSettings'
    };

    Object.keys(tabBtns).forEach(k => {
        const btn = document.getElementById(tabBtns[k]);
        if (btn) {
            btn.classList.remove('text-sky-400', 'border-sky-400');
            btn.classList.add('text-slate-400', 'border-transparent');
        }
    });

    const activeViewId = views[tabName] || 'viewLogs';
    const activeView = document.getElementById(activeViewId);
    if (activeView) {
        activeView.classList.remove('hidden');
        activeView.classList.add('flex');
        activeView.style.display = 'flex';
    }

    const activeBtnId = tabBtns[tabName];
    const activeBtn = document.getElementById(activeBtnId);
    if (activeBtn) {
        activeBtn.classList.remove('text-slate-400', 'border-transparent');
        activeBtn.classList.add('text-sky-400', 'border-sky-400');
    }

    if (tabName === 'logs') {
        renderTableHeadersAndColumns();
        renderTable();
        updateKPIs();
    } else if (tabName === 'supervisor') {
        renderSupervisorStatistics();
    } else if (tabName === 'accomplishment') {
        generateAccomplishmentReport();
        renderCustomAccomplishmentsManageList();
    } else if (tabName === 'reports') {
        populateReportFilterOptions();
        generateReport();
    } else if (tabName === 'users') {
        renderUsersTable();
    } else if (tabName === 'settings') {
        renderCustomColumnLabelsEditor();
        renderSettingsTables();
    } else if (tabName === 'directory') {
        renderDirectoryTable();
    } else if (tabName === 'template') {
        populateEndorsementFormInputs();
        updateTemplateLivePreview();
    } else if (tabName === 'workday') {
        renderCalcCalendar();
        renderSavedOffDatesSummary();
        runWorkdayCalculator();
    }
}

function normalizeTicketObject(item, idx) {
    let extra = {};
    if (item.extraData && typeof item.extraData === "object") {
        extra = item.extraData;
    } else if (typeof item.extraData === "string" && item.extraData.trim().startsWith("{")) {
        try { extra = JSON.parse(item.extraData); } catch (e) {}
    }

    const refNo = String(item.referralNo || item['Referral / Ticket #'] || item.ticketNo || '').trim();
    const rawDate = item.dateReceived || item['Date Received'] || getTodayMMDDYYYY();
    const cleanDate = formatCleanDate(rawDate);
    const adminVal = String(item.adminNo || item['Admin No.'] || extra.adminNo || '').trim();
    const platVal = String(item.platform || item['Platform'] || 'FACEBOOK').trim();
    const compVal = String(item.complainantName || item['Complainant'] || item.complainant || '').trim();
    const catVal = String(item.category || item['Category'] || '').trim();
    const typeVal = String(item.ticketType || item['Type'] || 'Simple (Request for Information, Feedback, etc.)').trim();
    const detVal = String(item.ticketDetails || item['Details of Ticket'] || item.details || '').trim();
    const respVal = String(item.responseDetails || item['Response Details'] || item.response || '').trim();
    const actVal = String(item.actionTaken || item['Action Taken'] || 'Answered').trim();
    const statVal = String(item.status || item['Status'] || 'Closed').trim();
    const remVal = String(item.remarks || item['Remarks'] || '').trim();

    return {
        rowIndex: item.rowIndex || (idx + 2),
        adminNo: adminVal,
        platform: platVal,
        dateReceived: cleanDate,
        referralNo: refNo,
        complainantName: compVal,
        category: catVal,
        ticketType: typeVal,
        ticketDetails: detVal,
        responseDetails: respVal,
        actionTaken: actVal,
        status: statVal,
        remarks: remVal,
        extraData: extra
    };
}

async function fetchAllCloudData(silent = false) {
    updateSyncStatusBadge("syncing");
    await flushPendingSyncQueue(true);

    try {
        const [logsResp, usersResp, settingsResp] = await Promise.all([
            fetch(APPS_SCRIPT_URL + "?t=" + Date.now(), { mode: 'cors' }),
            fetch(APPS_SCRIPT_URL + "?action=getUsers&t=" + Date.now(), { mode: 'cors' }),
            fetch(APPS_SCRIPT_URL + "?action=getSettings&t=" + Date.now(), { mode: 'cors' })
        ]);

        if (logsResp && logsResp.ok) {
            const logsResult = await logsResp.json();
            if (Array.isArray(logsResult)) {
                const validRows = logsResult.filter(item => !String(item.rowIndex || item['#'] || '').toUpperCase().startsWith('DATE:'));
                const cloudList = validRows.map((item, idx) => normalizeTicketObject(item, idx));
                AppState.tickets = mergeQueuedTicketsIntoList(cloudList);
                saveStorage();
            }
        }

        if (usersResp && usersResp.ok) {
            const usersResult = await usersResp.json();
            if (Array.isArray(usersResult) && usersResult.length > 0) {
                AppState.users = usersResult;
                localStorage.setItem('LTO_CPAO_USERS_2026', JSON.stringify(AppState.users));
            }
        }

        if (settingsResp && settingsResp.ok) {
            const settingsResult = await settingsResp.json();
            const cloudSettings = (settingsResult && typeof settingsResult === "object" && settingsResult.settings && typeof settingsResult.settings === "object")
                ? settingsResult.settings
                : settingsResult;
            if (cloudSettings && typeof cloudSettings === "object") {
                AppState.settings = mergeSettingsSafely(AppState.settings, cloudSettings, true);
                persistLocalSettingsCache();
            }
        }

        await fetchOffDatesFromCloud();

        populateDropdowns();
        renderTableHeadersAndColumns();
        renderCustomColumnLabelsEditor();
        renderTable();
        updateKPIs();
        renderUsersTable();
        renderSettingsTables();
        renderDirectoryTable();
        updateUIPrivileges();
        if (document.getElementById('viewSupervisor')?.style.display !== 'none') {
            renderSupervisorStatistics();
        }
        if (document.getElementById('viewReports')?.style.display !== 'none' && document.getElementById('repStartDate')?.value && document.getElementById('repEndDate')?.value) {
            generateReport();
        }
        if (document.getElementById('viewAccomplishment')?.style.display !== 'none') {
            generateAccomplishmentReport();
        }
        updateSyncStatusBadge("synced");
        if (!silent) showToast("Cloud data synchronized.");
    } catch (err) {
        console.warn("Cloud sync error:", err);
        updateSyncStatusBadge(loadPendingSyncQueue().length > 0 ? "queued" : "error");
        if (!silent) showToast("Showing cached data — check cloud connection.");
    }
}

async function saveAllSettingsToCloud(silent = false) {
    persistLocalSettingsCache();
    updateSyncStatusBadge("syncing");
    try {
        const resp = await fetchWithRetry(APPS_SCRIPT_URL, {
            method: "POST",
            headers: { "Content-Type": "text/plain;charset=utf-8" },
            body: JSON.stringify({
                action: "saveSettings",
                settings: AppState.settings
            })
        }, 2);
        const resData = await resp.json();
        updateSyncStatusBadge("synced");
        if (!silent) {
            if (resData && resData.status === "error") {
                showSystemAlert("Cloud Save Warning", resData.message || "Settings saved locally; cloud returned a message.", "⚠️");
            } else {
                showToast("All settings saved to Google Sheets.");
            }
        }
    } catch (e) {
        updateSyncStatusBadge("error");
        if (!silent) showToast("Settings saved locally.");
    }
}

async function syncUsersToCloud(silent = true) {
    try {
        localStorage.setItem('LTO_CPAO_USERS_2026', JSON.stringify(AppState.users || []));
    } catch (e) {}
    updateSyncStatusBadge("syncing");
    try {
        await fetchWithRetry(APPS_SCRIPT_URL, {
            method: "POST",
            headers: { "Content-Type": "text/plain;charset=utf-8" },
            body: JSON.stringify({
                action: "saveUsers",
                users: AppState.users || []
            })
        }, 2);
        updateSyncStatusBadge("synced");
        if (!silent) showToast("User accounts synced with Google Sheets.");
    } catch (e) {
        updateSyncStatusBadge("error");
    }
}

function checkScheduledPortalAssignment() {
    if (!currentUser || !currentUser.username) return;
    const u = AppState.users.find(x => String(x.username || '').toLowerCase() === String(currentUser.username || '').toLowerCase());
    if (!u) return;
    currentUser = {
        ...currentUser,
        ...u,
        adminNo: u.adminNo || currentUser.adminNo || deriveOperatorAdminNo(u)
    };
    const badgeEl = document.getElementById('userRoleBadge');
    if (badgeEl) badgeEl.textContent = String(currentUser.role || 'Admin').toUpperCase();
    const opEl = document.getElementById('activeOperatorName');
    if (opEl) opEl.textContent = currentUser.name || currentUser.username;
    updateUIPrivileges();
}

function populateDropdowns() {
    ensureCategoryGroupsInitialized();

    const platSel = document.getElementById('formPlatform');
    const filterPlat = document.getElementById('filterPlatform');
    const platforms = AppState.settings.platforms || [];

    if (platSel) {
        platSel.innerHTML = platforms.map(p => `<option value="${escapeHtml(p.name)}">${escapeHtml(p.name)}</option>`).join('');
    }
    if (filterPlat) {
        filterPlat.innerHTML = `<option value="">All Portals</option>` + platforms.map(p => `<option value="${escapeHtml(p.name)}">${escapeHtml(p.name)}</option>`).join('');
    }

    const typeSel = document.getElementById('formTicketType');
    if (typeSel) {
        typeSel.innerHTML = (AppState.settings.ticketTypes || []).map(t => `<option value="${escapeHtml(t)}">${escapeHtml(t)}</option>`).join('');
    }

    const actSel = document.getElementById('formActionTaken');
    if (actSel) {
        actSel.innerHTML = (AppState.settings.actionsTaken || []).map(a => `<option value="${escapeHtml(a)}">${escapeHtml(a)}</option>`).join('');
    }

    const statSel = document.getElementById('formStatus');
    const filterStat = document.getElementById('filterStatus');
    const statuses = AppState.settings.statuses || ["Closed", "Pending"];
    if (statSel) {
        statSel.innerHTML = statuses.map(s => `<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`).join('');
    }
    if (filterStat) {
        filterStat.innerHTML = `<option value="">All Status</option>` + statuses.map(s => `<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`).join('');
    }

    const userPortalSel = document.getElementById('formUserDefaultPortal');
    if (userPortalSel) {
        userPortalSel.innerHTML = platforms.map(p => `<option value="${escapeHtml(p.name)}">${escapeHtml(p.name)}</option>`).join('');
    }

    populateReportFilterOptions();
}

function getAllCategoriesFlat() {
    ensureCategoryGroupsInitialized();
    const list = [];
    CATEGORY_GROUPS.forEach(grp => {
        (AppState.settings.categoryGroups[grp] || []).forEach(c => {
            if (!list.some(item => item.name.toLowerCase() === c.toLowerCase())) {
                list.push({ name: c, group: grp });
            }
        });
    });
    return list;
}

function showCategoryDropdown() {
    const searchInput = document.getElementById('formCategorySearch');
    filterCategoryDropdown(searchInput ? searchInput.value : '');
}

function filterCategoryDropdown(query) {
    const listEl = document.getElementById('categoryDropdownList');
    if (!listEl) return;

    const q = String(query || '').trim().toLowerCase();
    const allCats = getAllCategoriesFlat();
    const matches = q
        ? allCats.filter(c => c.name.toLowerCase().includes(q) || c.group.toLowerCase().includes(q))
        : allCats;

    if (matches.length === 0) {
        listEl.innerHTML = `<div class="p-2.5 text-slate-400 text-[11px]">No matching category found.</div>`;
        listEl.classList.remove('hidden');
        return;
    }

    listEl.innerHTML = matches.map(c => `
        <button type="button" onclick="selectCategoryFromDropdown('${escapeHtml(c.name)}')" class="w-full text-left px-3 py-2 hover:bg-slate-800 flex items-center justify-between gap-2 border-b border-slate-800/60 last:border-b-0">
            <span class="font-semibold text-white">${escapeHtml(c.name)}</span>
            <span class="text-[10px] text-amber-400 font-bold shrink-0">${escapeHtml(c.group)}</span>
        </button>
    `).join('');
    listEl.classList.remove('hidden');
}

function selectCategoryFromDropdown(catName) {
    const inp = document.getElementById('formCategorySearch');
    const listEl = document.getElementById('categoryDropdownList');
    if (inp) inp.value = catName;
    if (listEl) listEl.classList.add('hidden');
}

document.addEventListener('click', (e) => {
    const inp = document.getElementById('formCategorySearch');
    const listEl = document.getElementById('categoryDropdownList');
    if (listEl && !listEl.classList.contains('hidden')) {
        if (!listEl.contains(e.target) && e.target !== inp) {
            listEl.classList.add('hidden');
        }
    }
});

function update24HourSwitchVisibility() {
    const actionVal = String(document.getElementById('formActionTaken')?.value || '').toLowerCase();
    const statusVal = String(document.getElementById('formStatus')?.value || '').toLowerCase();
    const wrapper = document.getElementById('switch24HoursWrapper');
    if (!wrapper) return;
    const isWaitingClient = actionVal.includes('waiting for further information') || actionVal.includes('documents needed') || statusVal.includes('waiting');
    wrapper.classList.toggle('hidden', !isWaitingClient);
    if (!isWaitingClient) {
        const sw = document.getElementById('formSwitch24Hours');
        if (sw) sw.checked = false;
    }
}

function addAdminPrefix() {
    const respArea = document.getElementById('formResponseDetails');
    if (!respArea) return;
    const tag = `[${currentUser.adminNo || deriveOperatorAdminNo(currentUser) || 'ADMIN'}] `;
    if (!respArea.value.startsWith(tag)) {
        respArea.value = tag + respArea.value;
    }
    respArea.focus();
}

function autoGenTicketNo(force = false) {
    const editIdxVal = document.getElementById('editIndex')?.value;
    const isEditing = editIdxVal !== "" && editIdxVal !== null && editIdxVal !== undefined;
    const refInput = document.getElementById('formReferralNo');
    const modeLabel = document.getElementById('ticketGenModeLabel');
    if (!refInput) return;

    if (isEditing && !force) {
        if (modeLabel) modeLabel.textContent = "(Editing Existing Record)";
        return;
    }

    const platName = document.getElementById('formPlatform')?.value || "FACEBOOK";
    const platObj = (AppState.settings.platforms || []).find(p => String(p.name).toUpperCase() === String(platName).toUpperCase());
    const dateVal = document.getElementById('formDateReceived')?.value || getTodayISO();
    const mdy = isoToMMDDYYYY(dateVal);

    if (platObj && platObj.autoGen === false) {
        if (modeLabel) modeLabel.textContent = "(Manual Reference #)";
        if (force) refInput.value = "";
        return;
    }

    if (modeLabel) modeLabel.textContent = "(Auto-Generated)";
    const prefix = (platObj && platObj.prefix) ? platObj.prefix : "CPAO";
    const dateToken = mdy.replace(/\//g, "");

    const existingNums = new Set(
        (AppState.tickets || []).map(t => String(t.referralNo || '').trim().toUpperCase())
    );

    let seq = 1;
    let candidate = "";
    do {
        candidate = `${prefix}-${dateToken}-${String(seq).padStart(3, '0')}`;
        seq++;
    } while (existingNums.has(candidate.toUpperCase()));

    refInput.value = candidate;
}

function onPlatformChange() {
    autoGenTicketNo(true);
}

function openTicketModal(index = null) {
    if (isAdminSV()) {
        showSystemAlert("View-Only Supervisor Role", "AdminSV accounts monitor statistics and logs in view-only mode.", "📊");
        return;
    }

    populateDropdowns();
    pendingTicketSubmission = null;
    editingTicketOriginalState = null;

    const modal = document.getElementById('ticketModal');
    const titleEl = document.getElementById('modalTitle');
    const editIdxEl = document.getElementById('editIndex');

    if (index === null || index === undefined) {
        if (titleEl) titleEl.textContent = "Create New Ticket Log Record";
        if (editIdxEl) editIdxEl.value = "";
        const opAdminNo = currentUser.adminNo || deriveOperatorAdminNo(currentUser) || "ADMIN";
        document.getElementById('formAdminNo').value = opAdminNo;
        const defaultPlat = currentUser.defaultPortal || (AppState.settings.platforms?.[0]?.name || "FACEBOOK");
        document.getElementById('formPlatform').value = defaultPlat;
        setSystemDateInputValue('formDateReceived', getTodayISO());
        document.getElementById('formComplainantName').value = "";
        document.getElementById('formCategorySearch').value = "";
        if (document.getElementById('formTicketType').options.length > 0) document.getElementById('formTicketType').selectedIndex = 0;
        if (document.getElementById('formActionTaken').options.length > 0) document.getElementById('formActionTaken').selectedIndex = 0;
        if (document.getElementById('formStatus').options.length > 0) document.getElementById('formStatus').selectedIndex = 0;
        document.getElementById('formTicketDetails').value = "";
        document.getElementById('formResponseDetails').value = "";
        document.getElementById('formRemarks').value = "";
        const sw = document.getElementById('formSwitch24Hours');
        if (sw) sw.checked = false;
        autoGenTicketNo(true);
    } else {
        const t = AppState.tickets[index];
        if (!t) return;
        if (!canEditOrDeleteTicket(t)) {
            showSystemAlert("Permission Denied", "Normal admins can only edit their own logs. Only Super Admin and AdminTL can edit other admins' logs.", "🔒");
            return;
        }
        editingTicketOriginalState = JSON.parse(JSON.stringify(t));
        if (titleEl) titleEl.textContent = `Edit Ticket Log Record (${t.referralNo || '#' + (index + 1)})`;
        if (editIdxEl) editIdxEl.value = String(index);
        document.getElementById('formAdminNo').value = t.adminNo || currentUser.adminNo || deriveOperatorAdminNo(currentUser);
        document.getElementById('formPlatform').value = t.platform || "FACEBOOK";
        setSystemDateInputValue('formDateReceived', mmddyyyyToISO(t.dateReceived || getTodayMMDDYYYY()));
        document.getElementById('formReferralNo').value = t.referralNo || "";
        document.getElementById('formComplainantName').value = t.complainantName || "";
        document.getElementById('formCategorySearch').value = t.category || "";
        document.getElementById('formTicketType').value = t.ticketType || "Simple (Request for Information, Feedback, etc.)";
        document.getElementById('formTicketDetails').value = t.ticketDetails || "";
        document.getElementById('formResponseDetails').value = t.responseDetails || "";
        document.getElementById('formActionTaken').value = t.actionTaken || "Answered";
        document.getElementById('formStatus').value = t.status || "Closed";
        document.getElementById('formRemarks').value = t.remarks || "";
        const sw = document.getElementById('formSwitch24Hours');
        if (sw) sw.checked = !!(t.extraData && t.extraData.timer24hEnabled);
        autoGenTicketNo(false);
    }

    update24HourSwitchVisibility();
    modal.style.display = 'flex';
}

function closeTicketModal(discardDraft = false) {
    if (discardDraft) lastTicketModalDraft = null;
    const listEl = document.getElementById('categoryDropdownList');
    if (listEl) listEl.classList.add('hidden');
    const modal = document.getElementById('ticketModal');
    if (modal) modal.style.display = 'none';
}

function validateAndSubmitTicketForm(e) {
    e.preventDefault();
    if (isSavingTicket) return;

    const editIdxStr = document.getElementById('editIndex')?.value;
    const isEditing = editIdxStr !== "" && editIdxStr !== null && editIdxStr !== undefined;
    const editIdx = isEditing ? parseInt(editIdxStr, 10) : -1;

    if (isEditing && !canEditOrDeleteTicket(AppState.tickets[editIdx])) {
        showSystemAlert("Permission Denied", "You are not allowed to modify another admin's log entry.", "🔒");
        return;
    }

    const complainantName = document.getElementById('formComplainantName').value.trim();
    const category = document.getElementById('formCategorySearch').value.trim();
    const ticketDetails = document.getElementById('formTicketDetails').value.trim();
    const responseDetails = document.getElementById('formResponseDetails').value.trim();
    const referralNo = document.getElementById('formReferralNo').value.trim();

    if (!complainantName || !category || !ticketDetails || !responseDetails) {
        showSystemAlert("Missing Required Fields", "Please fill in Complainant Name, Category, Details of Ticket / Concern, and Details of Response.", "⚠️");
        return;
    }

    if (category) {
        const grp = getGroupForCategory(category);
        if (!Array.isArray(AppState.settings.categoryGroups[grp])) AppState.settings.categoryGroups[grp] = [];
        if (!AppState.settings.categoryGroups[grp].some(c => c.toLowerCase() === category.toLowerCase())) {
            AppState.settings.categoryGroups[grp].push(category);
            syncFlatCategoriesFromGroups();
            persistLocalSettingsCache();
            populateDropdowns();
            renderSettingsTables();
            saveAllSettingsToCloud(true);
        }
    }

    const dateIso = document.getElementById('formDateReceived').value || getTodayISO();
    const dateMdy = isoToMMDDYYYY(dateIso);
    const existingTicket = isEditing ? AppState.tickets[editIdx] : null;
    const timer24hEnabled = !!(document.getElementById('formSwitch24Hours')?.checked);

    const newTicketObj = {
        rowIndex: existingTicket ? existingTicket.rowIndex : null,
        adminNo: isEditing ? (existingTicket.adminNo || document.getElementById('formAdminNo').value.trim()) : (document.getElementById('formAdminNo').value.trim() || currentUser.adminNo || deriveOperatorAdminNo(currentUser)),
        platform: document.getElementById('formPlatform').value.trim() || "FACEBOOK",
        dateReceived: dateMdy,
        referralNo,
        complainantName,
        category,
        ticketType: document.getElementById('formTicketType').value.trim(),
        ticketDetails,
        responseDetails,
        actionTaken: document.getElementById('formActionTaken').value.trim(),
        status: document.getElementById('formStatus').value.trim(),
        remarks: document.getElementById('formRemarks').value.trim(),
        extraData: {
            ...(existingTicket?.extraData || {}),
            createdByUsername: existingTicket?.extraData?.createdByUsername || currentUser.username,
            timer24hEnabled,
            timer24hStartedAt: timer24hEnabled
                ? (existingTicket?.extraData?.timer24hStartedAt || Date.now())
                : null
        }
    };

    const dupMatches = (AppState.tickets || []).filter((t, idx) => {
        if (isEditing && idx === editIdx) return false;
        const sameComp = String(t.complainantName || '').trim().toLowerCase() === complainantName.toLowerCase();
        const sameCat = String(t.category || '').trim().toLowerCase() === category.toLowerCase();
        return sameComp && sameCat;
    });

    if (dupMatches.length > 0 && !isEditing) {
        pendingTicketSubmission = { ticketObj: newTicketObj, isEditing: false, editIdx: -1 };
        document.getElementById('dupComplainantLabel').textContent = complainantName;
        document.getElementById('dupCategoryLabel').textContent = category;
        document.getElementById('dupExistingDetailsBox').innerHTML = dupMatches.map(m => `
            <div class="p-2.5 bg-slate-900 border border-slate-800 rounded-lg space-y-1">
                <div class="flex justify-between font-bold text-amber-300">
                    <span>Ticket #: ${escapeHtml(m.referralNo || 'N/A')}</span>
                    <span>Date: ${escapeHtml(m.dateReceived || '')}</span>
                </div>
                <div class="text-slate-300">Status: <strong>${escapeHtml(m.status || '')}</strong> | Action: ${escapeHtml(m.actionTaken || '')}</div>
                <div class="text-slate-400 text-[11px]">${escapeHtml(m.ticketDetails || '')}</div>
            </div>
        `).join('');
        document.getElementById('duplicateWarningModal').style.display = 'flex';
        return;
    }

    commitTicketSubmission(newTicketObj, isEditing, editIdx);
}

function cancelDuplicateTicketSave() {
    pendingTicketSubmission = null;
    const dupModal = document.getElementById('duplicateWarningModal');
    if (dupModal) dupModal.style.display = 'none';
}

function proceedDuplicateTicketSave() {
    const item = pendingTicketSubmission;
    cancelDuplicateTicketSave();
    if (item) {
        commitTicketSubmission(item.ticketObj, item.isEditing, item.editIdx);
    }
}

function isUnknownActionErrorMessage(errMsg) {
    const m = String(errMsg || '').toLowerCase();
    return m.includes("unknown action") || m.includes("invalid action") || m.includes("action not found") || m.includes("unrecognized action");
}

async function sendTicketPayloadToAppsScript(actionName, rowIndex, ticketObj) {
    const payload = {
        action: actionName,
        rowIndex: rowIndex || undefined,
        ticket: ticketObj,
        adminNo: ticketObj.adminNo,
        platform: ticketObj.platform,
        dateReceived: ticketObj.dateReceived,
        referralNo: ticketObj.referralNo,
        complainantName: ticketObj.complainantName,
        category: ticketObj.category,
        ticketType: ticketObj.ticketType,
        ticketDetails: ticketObj.ticketDetails,
        responseDetails: ticketObj.responseDetails,
        actionTaken: ticketObj.actionTaken,
        status: ticketObj.status,
        remarks: ticketObj.remarks,
        extraData: ticketObj.extraData || {}
    };

    const resp = await fetchWithRetry(APPS_SCRIPT_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(payload)
    }, 2);

    const text = await resp.text();
    let resData = {};
    try { resData = JSON.parse(text); } catch (e) { resData = { raw: text }; }

    const errMsg = resData && resData.status === "error" ? String(resData.message || "Error from script") : "";
    return { resData, errMsg };
}

async function commitTicketSubmission(ticketObj, isEditing, editIdx) {
    if (isSavingTicket) return;
    isSavingTicket = true;
    const submitBtn = document.getElementById('btnSubmitTicket');
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = "Saving & Syncing...";
    }
    updateSyncStatusBadge("syncing");

    try {
        let savedIndex = -1;
        if (isEditing && editIdx >= 0 && AppState.tickets[editIdx]) {
            AppState.tickets[editIdx] = { ...AppState.tickets[editIdx], ...ticketObj };
            savedIndex = editIdx;
        } else {
            AppState.tickets.unshift({ ...ticketObj });
            savedIndex = 0;
        }
        saveStorage();
        renderTable();
        updateKPIs();
        if (document.getElementById('viewSupervisor')?.style.display !== 'none') {
            renderSupervisorStatistics();
        }
        lastTicketModalDraft = null;
        closeTicketModal(true);

        const targetRowIdx = (isEditing && editingTicketOriginalState && editingTicketOriginalState.rowIndex)
            ? editingTicketOriginalState.rowIndex
            : (ticketObj.rowIndex || null);

        const storageKey = isEditing ? LAST_WORKING_UPDATE_ACTION_KEY : LAST_WORKING_ADD_ACTION_KEY;
        const cachedAction = localStorage.getItem(storageKey);

        const actionCandidates = Array.from(new Set(
            (isEditing
                ? [cachedAction, "updateLog", "updateTicket", "update", "editLog", "edit", "saveLog", "save"]
                : [cachedAction, "addLog", "addTicket", "createLog", "createTicket", "create", "add", "insert", "append", "saveLog", "save"]
            ).filter(Boolean)
        ));

        let syncedOk = false;
        let lastErrorMsg = "";

        for (const act of actionCandidates) {
            try {
                const { resData, errMsg } = await sendTicketPayloadToAppsScript(act, targetRowIdx, ticketObj);
                if (!errMsg) {
                    localStorage.setItem(storageKey, act);
                    if (resData && resData.rowIndex && AppState.tickets[savedIndex]) {
                        AppState.tickets[savedIndex].rowIndex = resData.rowIndex;
                        saveStorage();
                    }
                    syncedOk = true;
                    const clientKey = `${String(ticketObj.referralNo || '').trim().toLowerCase()}|${String(ticketObj.dateReceived || '').trim()}|${String(ticketObj.complainantName || '').trim().toLowerCase()}`;
                    removePendingTicketSync(clientKey);
                    break;
                }
                lastErrorMsg = errMsg;
                if (!isUnknownActionErrorMessage(errMsg)) {
                    break;
                }
            } catch (networkErr) {
                lastErrorMsg = networkErr.message || "Network error";
            }
        }

        if (syncedOk) {
            updateSyncStatusBadge("synced");
            showToast(isEditing ? "Ticket updated & synced with Google Sheets." : "Ticket saved & synced with Google Sheets.");
            await fetchAllCloudData(true);
        } else {
            enqueuePendingTicketSync(ticketObj, isEditing, targetRowIdx);
            updateSyncStatusBadge("queued");
            showToast("Saved locally & queued for instant cloud sync.");
        }
    } finally {
        isSavingTicket = false;
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = "Save Log Entry";
        }
    }
}

async function deleteTicketRow(index) {
    if (isAdminSV()) {
        showSystemAlert("View-Only Supervisor Role", "AdminSV cannot delete logs.", "🔒");
        return;
    }
    const t = AppState.tickets[index];
    if (!t) return;
    if (!canEditOrDeleteTicket(t)) {
        showSystemAlert("Permission Denied", "Normal admins can only delete their own logs. Only Super Admin and AdminTL can delete other admins' logs.", "🔒");
        return;
    }

    showSystemConfirm(
        "Delete Ticket Log",
        `Are you sure you want to delete ticket ${t.referralNo || '#' + (index + 1)}?`,
        async () => {
            AppState.tickets.splice(index, 1);
            saveStorage();
            renderTable();
            updateKPIs();
            updateSyncStatusBadge("syncing");
            try {
                await fetchWithRetry(APPS_SCRIPT_URL, {
                    method: "POST",
                    headers: { "Content-Type": "text/plain;charset=utf-8" },
                    body: JSON.stringify({
                        action: "deleteLog",
                        rowIndex: t.rowIndex,
                        referralNo: t.referralNo,
                        dateReceived: t.dateReceived
                    })
                }, 2);
                updateSyncStatusBadge("synced");
                showToast("Log deleted and synced with Google Sheets.");
                await fetchAllCloudData(true);
            } catch (e) {
                updateSyncStatusBadge("error");
                showToast("Deleted locally; cloud sync pending.");
            }
        },
        "🗑️"
    );
}

function renderTableHeadersAndColumns() {
    const tr = document.getElementById('tableHeaderRow');
    if (!tr) return;
    tr.innerHTML = `
        <th>#</th>
        <th>${escapeHtml(getColLabel('col_adminNo'))}</th>
        <th>${escapeHtml(getColLabel('col_platform'))}</th>
        <th>${escapeHtml(getColLabel('col_dateReceived'))}</th>
        <th>${escapeHtml(getColLabel('col_referralNo'))}</th>
        <th>${escapeHtml(getColLabel('col_complainantName'))}</th>
        <th>${escapeHtml(getColLabel('col_category'))}</th>
        <th>${escapeHtml(getColLabel('col_ticketType'))}</th>
        <th>${escapeHtml(getColLabel('col_ticketDetails'))}</th>
        <th>${escapeHtml(getColLabel('col_responseDetails'))}</th>
        <th>${escapeHtml(getColLabel('col_actionTaken'))}</th>
        <th>${escapeHtml(getColLabel('col_status'))}</th>
        <th>${escapeHtml(getColLabel('col_remarks'))}</th>
        <th class="text-center">${escapeHtml(getColLabel('col_actions'))}</th>
    `;
}

function getFilteredTickets() {
    const q = (document.getElementById('searchInput')?.value || '').trim().toLowerCase();
    const dateFilter = (document.getElementById('filterDate')?.value || '').trim();
    const platFilter = (document.getElementById('filterPlatform')?.value || '').trim();
    const statFilter = (document.getElementById('filterStatus')?.value || '').trim();
    const scope = (document.getElementById('superadminViewScope')?.value || 'all').trim();

    return (AppState.tickets || []).map((t, originalIndex) => ({ t, originalIndex })).filter(({ t }) => {
        if (!isSuperAdmin() && !isAdminTL() && !isAdminSV()) {
            if (!isTicketOwnedByCurrentUser(t)) return false;
        } else if (scope === 'my') {
            if (!isTicketOwnedByCurrentUser(t)) return false;
        }

        if (dateFilter) {
            const targetMdy = isoToMMDDYYYY(dateFilter);
            if (formatCleanDate(t.dateReceived) !== targetMdy) return false;
        }
        if (platFilter && String(t.platform || '').toUpperCase() !== platFilter.toUpperCase()) return false;
        if (statFilter && String(t.status || '').toLowerCase() !== statFilter.toLowerCase()) return false;

        if (q) {
            const hay = `${t.adminNo || ''} ${t.platform || ''} ${t.referralNo || ''} ${t.complainantName || ''} ${t.category || ''} ${t.ticketDetails || ''} ${t.responseDetails || ''} ${t.remarks || ''}`.toLowerCase();
            if (!hay.includes(q)) return false;
        }
        return true;
    });
}

function getUserCustomRowColor(ticket) {
    if (!ticket || !Array.isArray(AppState.users)) return "";
    const tAdmin = String(ticket.adminNo || '').trim().toLowerCase();
    const tCreated = String(ticket.extraData?.createdByUsername || '').trim().toLowerCase();
    const matched = AppState.users.find(u => {
        const uAdmin = String(u.adminNo || deriveOperatorAdminNo(u) || '').trim().toLowerCase();
        const uName = String(u.name || '').trim().toLowerCase();
        const uUser = String(u.username || '').trim().toLowerCase();
        return (tCreated && uUser === tCreated) || (tAdmin && (tAdmin === uAdmin || tAdmin === uName || tAdmin === uUser));
    });
    if (matched && matched.logColor && matched.logColor !== "Default" && /^#[0-9a-fA-F]{6}$/.test(matched.logColor)) {
        return matched.logColor;
    }
    return "";
}

function renderTable() {
    renderTableHeadersAndColumns();
    const tbody = document.getElementById('logTableBody');
    if (!tbody) return;

    const rows = getFilteredTickets();
    if (!rows.length) {
        tbody.innerHTML = `<tr><td colspan="14" class="p-8 text-center text-slate-400">No ticket log records match the current filter.</td></tr>`;
        render24HourReminders();
        return;
    }

    tbody.innerHTML = rows.map(({ t, originalIndex }, idx) => {
        const isPending = String(t.status || '').trim().toLowerCase() === 'pending';
        const customColor = !isPending ? getUserCustomRowColor(t) : "";
        const rowClass = isPending ? "row-pending" : "hover:bg-slate-800/40";
        const rowStyle = customColor ? `style="background-color: ${customColor}22;"` : "";
        const canMod = canEditOrDeleteTicket(t);

        const actionButtons = canMod
            ? `<button type="button" onclick="openTicketModal(${originalIndex})" class="px-2 py-1 bg-sky-600 hover:bg-sky-500 text-white rounded text-[10px] font-bold">Edit</button>
               <button type="button" onclick="openEndorseModal(${originalIndex})" class="px-2 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded text-[10px] font-bold">Endorse</button>
               <button type="button" onclick="deleteTicketRow(${originalIndex})" class="px-2 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded text-[10px] font-bold">Del</button>`
            : `<button type="button" onclick="openEndorseModal(${originalIndex})" class="px-2 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded text-[10px] font-bold">Endorse</button>
               <span class="px-2 py-0.5 rounded bg-slate-800/80 text-slate-400 text-[10px] font-semibold border border-slate-700">View Only</span>`;

        return `
            <tr class="${rowClass}" ${rowStyle}>
                <td class="font-mono text-slate-400">${idx + 1}</td>
                <td class="font-bold text-amber-300 whitespace-nowrap">${escapeHtml(t.adminNo || '')}</td>
                <td><span class="chip-pill">${escapeHtml(t.platform || '')}</span></td>
                <td class="font-mono whitespace-nowrap">${escapeHtml(formatCleanDate(t.dateReceived))}</td>
                <td class="font-mono font-bold text-sky-300 whitespace-nowrap">${escapeHtml(t.referralNo || '')}</td>
                <td class="font-semibold">${escapeHtml(t.complainantName || '')}</td>
                <td>${escapeHtml(t.category || '')}</td>
                <td>${escapeHtml(t.ticketType || '')}</td>
                <td><div class="cell-clamp-2" title="${escapeHtml(t.ticketDetails || '')}">${escapeHtml(t.ticketDetails || '')}</div></td>
                <td><div class="cell-clamp-2" title="${escapeHtml(t.responseDetails || '')}">${escapeHtml(t.responseDetails || '')}</div></td>
                <td>${escapeHtml(t.actionTaken || '')}</td>
                <td><span class="chip-pill">${escapeHtml(t.status || '')}</span></td>
                <td>${escapeHtml(t.remarks || '')}</td>
                <td class="text-center whitespace-nowrap space-x-1">${actionButtons}</td>
            </tr>
        `;
    }).join('');

    render24HourReminders();
}

function updateKPIs() {
    const dateFilter = (document.getElementById('filterDate')?.value || '').trim();
    const labelEl = document.getElementById('kpiTotalLabel');
    if (labelEl) {
        labelEl.textContent = dateFilter ? `Logs (${isoToMMDDYYYY(dateFilter)})` : "All Logs";
    }

    const scope = (document.getElementById('superadminViewScope')?.value || 'all').trim();
    const pool = (AppState.tickets || []).filter(t => {
        if (!isSuperAdmin() && !isAdminTL() && !isAdminSV()) return isTicketOwnedByCurrentUser(t);
        if (scope === 'my') return isTicketOwnedByCurrentUser(t);
        return true;
    });

    const filtered = dateFilter
        ? pool.filter(t => formatCleanDate(t.dateReceived) === isoToMMDDYYYY(dateFilter))
        : pool;

    const total = filtered.length;
    const closed = filtered.filter(t => String(t.status || '').toLowerCase() === 'closed').length;
    const pending = filtered.filter(t => String(t.status || '').toLowerCase() === 'pending').length;
    const rate = total > 0 ? Math.round((closed / total) * 100) : 0;

    if (document.getElementById('kpiTotal')) document.getElementById('kpiTotal').textContent = String(total);
    if (document.getElementById('kpiClosed')) document.getElementById('kpiClosed').textContent = String(closed);
    if (document.getElementById('kpiPending')) document.getElementById('kpiPending').textContent = String(pending);
    if (document.getElementById('kpiRate')) document.getElementById('kpiRate').textContent = `${rate}%`;
}

function resetFiltersToToday() {
    if (document.getElementById('searchInput')) document.getElementById('searchInput').value = '';
    if (document.getElementById('filterPlatform')) document.getElementById('filterPlatform').value = '';
    if (document.getElementById('filterStatus')) document.getElementById('filterStatus').value = '';
    setSystemDateInputValue('filterDate', getTodayISO());
    renderTable();
    updateKPIs();
}

function render24HourReminders() {
    const banner = document.getElementById('reminder24hBanner');
    const listEl = document.getElementById('reminder24hList');
    if (!banner || !listEl) return;

    const now = Date.now();
    const expired = (AppState.tickets || []).map((t, index) => ({ t, index })).filter(({ t }) => {
        if (!t.extraData || !t.extraData.timer24hEnabled) return false;
        if (String(t.status || '').toLowerCase() === 'closed') return false;
        const started = Number(t.extraData.timer24hStartedAt || 0);
        if (!started) return false;
        return (now - started) >= (24 * 60 * 60 * 1000);
    });

    if (!expired.length) {
        banner.classList.add('hidden');
        listEl.innerHTML = '';
        return;
    }

    banner.classList.remove('hidden');
    listEl.innerHTML = expired.map(({ t, index }) => `
        <div class="flex flex-wrap items-center justify-between gap-2 bg-slate-950/80 border border-amber-500/30 rounded-lg p-2.5 text-xs">
            <div>
                <span class="font-mono font-bold text-amber-300">${escapeHtml(t.referralNo || 'Ticket')}</span>
                <span class="text-slate-300 ml-2">${escapeHtml(t.complainantName || '')}</span>
                <span class="text-slate-400 text-[11px] ml-2">(${escapeHtml(t.category || '')})</span>
            </div>
            ${canEditOrDeleteTicket(t) ? `<button type="button" onclick="autoClose24hTicket(${index})" class="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[11px] font-bold">Auto-Close Ticket</button>` : ''}
        </div>
    `).join('');
}

async function autoClose24hTicket(index) {
    const t = AppState.tickets[index];
    if (!t || !canEditOrDeleteTicket(t)) return;
    t.status = "Closed";
    t.remarks = (t.remarks ? t.remarks + " | " : "") + "Auto-closed after 24h client compliance window";
    if (t.extraData) t.extraData.timer24hEnabled = false;
    saveStorage();
    renderTable();
    updateKPIs();
    await sendTicketPayloadToAppsScript("updateLog", t.rowIndex, t).catch(() => {});
    showToast(`Ticket ${t.referralNo} marked as Closed.`);
}

// ============================================================================
// SUPERVISOR STATISTICS (ADMIN SV / ADMINTL / SUPER ADMIN)
// ============================================================================
function setSupervisorPeriod(period) {
    supervisorPeriod = period || "daily";
    ["daily", "weekly", "monthly", "annual"].forEach(p => {
        const btn = document.getElementById("svPeriod" + p.charAt(0).toUpperCase() + p.slice(1));
        if (!btn) return;
        if (p === supervisorPeriod) {
            btn.className = "px-3 py-1.5 rounded-md font-bold bg-sky-600 text-white";
        } else {
            btn.className = "px-3 py-1.5 rounded-md font-bold text-slate-300 hover:bg-slate-800";
        }
    });
    renderSupervisorStatistics();
}

function parseTicketDateObj(dateStr) {
    const clean = formatCleanDate(dateStr);
    const iso = mmddyyyyToISO(clean);
    const d = new Date(iso + "T12:00:00");
    return isNaN(d.getTime()) ? null : d;
}

function isAnsweredOrClosedTicket(t) {
    const st = String(t.status || "").trim().toLowerCase();
    const act = String(t.actionTaken || "").trim().toLowerCase();
    const resp = String(t.responseDetails || "").trim();
    return st === "closed" || st === "resolved" || act.includes("answered") || resp.length > 0;
}

function renderSupervisorStatistics() {
    const tbody = document.getElementById("svAdminStatsTableBody");
    const barChartEl = document.getElementById("svAdminBarChart");
    const oversightEl = document.getElementById("svOversightSummary");
    const filterSel = document.getElementById("svAdminFilter");
    if (!tbody || !barChartEl || !oversightEl) return;

    const refIso = document.getElementById("svRefDate")?.value || getTodayISO();
    const refDate = new Date(refIso + "T12:00:00");
    const refYear = refDate.getFullYear();
    const refMonth = refDate.getMonth();
    const refDayStr = isoToMMDDYYYY(refIso);

    const startOfWeek = new Date(refDate);
    startOfWeek.setDate(refDate.getDate() - refDate.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    const inDaily = (d) => d && isoToMMDDYYYY(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`) === refDayStr;
    const inWeekly = (d) => d && d >= startOfWeek && d <= endOfWeek;
    const inMonthly = (d) => d && d.getFullYear() === refYear && d.getMonth() === refMonth;
    const inAnnual = (d) => d && d.getFullYear() === refYear;

    const inSelectedPeriod = (d) => {
        if (supervisorPeriod === "weekly") return inWeekly(d);
        if (supervisorPeriod === "monthly") return inMonthly(d);
        if (supervisorPeriod === "annual") return inAnnual(d);
        return inDaily(d);
    };

    const rangeLabel = supervisorPeriod === "weekly"
        ? `Week: ${isoToMMDDYYYY(startOfWeek.toISOString().slice(0, 10))} – ${isoToMMDDYYYY(endOfWeek.toISOString().slice(0, 10))}`
        : supervisorPeriod === "monthly"
            ? `Month: ${String(refMonth + 1).padStart(2, '0')}/01/${refYear} – ${isoToMMDDYYYY(refIso)}`
            : supervisorPeriod === "annual"
                ? `Year: ${refYear}`
                : `Date: ${refDayStr}`;

    const rangeTextEl = document.getElementById("svDateRangeText");
    if (rangeTextEl) rangeTextEl.textContent = rangeLabel;
    if (document.getElementById("svKpiPeriodLabel")) {
        document.getElementById("svKpiPeriodLabel").textContent = supervisorPeriod.toUpperCase();
    }

    const adminKeyMap = new Map();
    const registerAdmin = (label, role, username) => {
        const cleanLabel = String(label || username || "Admin").trim();
        const key = cleanLabel.toLowerCase();
        if (!adminKeyMap.has(key)) {
            adminKeyMap.set(key, {
                key,
                name: cleanLabel,
                role: role || "Admin",
                daily: 0,
                weekly: 0,
                monthly: 0,
                annual: 0,
                periodTotal: 0,
                answered: 0,
                pending: 0
            });
        }
        return adminKeyMap.get(key);
    };

    (AppState.users || []).forEach(u => {
        const adminTag = u.adminNo || deriveOperatorAdminNo(u) || u.name || u.username;
        registerAdmin(adminTag, u.role || "Admin", u.username);
    });

    (AppState.tickets || []).forEach(t => {
        const d = parseTicketDateObj(t.dateReceived);
        const ownerLabel = String(t.adminNo || t.extraData?.createdByUsername || "Unassigned Admin").trim();
        const rec = registerAdmin(ownerLabel, "Admin", ownerLabel);

        if (inDaily(d)) rec.daily++;
        if (inWeekly(d)) rec.weekly++;
        if (inMonthly(d)) rec.monthly++;
        if (inAnnual(d)) rec.annual++;

        if (inSelectedPeriod(d)) {
            rec.periodTotal++;
            if (isAnsweredOrClosedTicket(t)) {
                rec.answered++;
            } else {
                rec.pending++;
            }
        }
    });

    const allRecords = Array.from(adminKeyMap.values()).sort((a, b) => b.periodTotal - a.periodTotal || a.name.localeCompare(b.name));

    if (filterSel) {
        const prevVal = filterSel.value;
        filterSel.innerHTML = `<option value="">All Admins (${allRecords.length})</option>` + allRecords.map(r =>
            `<option value="${escapeHtml(r.key)}">${escapeHtml(r.name)} (${escapeHtml(r.role)})</option>`
        ).join("");
        if (Array.from(filterSel.options).some(o => o.value === prevVal)) filterSel.value = prevVal;
    }

    const selectedKey = filterSel?.value || "";
    const visibleRecords = selectedKey ? allRecords.filter(r => r.key === selectedKey) : allRecords;

    const sumPeriod = visibleRecords.reduce((acc, r) => acc + r.periodTotal, 0);
    const sumAnswered = visibleRecords.reduce((acc, r) => acc + r.answered, 0);
    const sumPending = visibleRecords.reduce((acc, r) => acc + r.pending, 0);
    const activeAdminsCount = visibleRecords.filter(r => r.periodTotal > 0).length;
    const overallRate = sumPeriod > 0 ? Math.round((sumAnswered / sumPeriod) * 100) : 0;

    if (document.getElementById("svKpiTotalLogs")) document.getElementById("svKpiTotalLogs").textContent = String(sumPeriod);
    if (document.getElementById("svKpiAnswered")) document.getElementById("svKpiAnswered").textContent = String(sumAnswered);
    if (document.getElementById("svKpiResponseRate")) document.getElementById("svKpiResponseRate").textContent = `${overallRate}%`;
    if (document.getElementById("svKpiPending")) document.getElementById("svKpiPending").textContent = String(sumPending);
    if (document.getElementById("svKpiActiveAdmins")) document.getElementById("svKpiActiveAdmins").textContent = String(activeAdminsCount);

    const maxLogs = Math.max(1, ...visibleRecords.map(r => r.periodTotal));
    barChartEl.innerHTML = visibleRecords.length ? visibleRecords.map(r => {
        const rate = r.periodTotal > 0 ? Math.round((r.answered / r.periodTotal) * 100) : 0;
        const widthPct = Math.round((r.periodTotal / maxLogs) * 100);
        const answeredPct = r.periodTotal > 0 ? Math.round((r.answered / r.periodTotal) * widthPct) : 0;
        return `
            <div class="bg-slate-950/80 border border-slate-800 rounded-lg p-2.5 space-y-1.5">
                <div class="flex items-center justify-between text-xs">
                    <span class="font-bold text-white">${escapeHtml(r.name)} <span class="text-[10px] text-amber-400">(${escapeHtml(r.role)})</span></span>
                    <span class="font-mono text-[11px] text-slate-300">Logs: <strong class="text-sky-400">${r.periodTotal}</strong> | Answered: <strong class="text-emerald-400">${r.answered}</strong> | Rate: <strong class="text-amber-400">${rate}%</strong></span>
                </div>
                <div class="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden flex">
                    <div style="width: ${answeredPct}%" class="bg-emerald-500 h-full" title="Answered"></div>
                    <div style="width: ${Math.max(0, widthPct - answeredPct)}%" class="bg-sky-500/70 h-full" title="Other / Pending"></div>
                </div>
            </div>
        `;
    }).join("") : `<div class="text-slate-400 text-xs py-6 text-center">No admin records found.</div>`;

    const topResponder = [...visibleRecords].filter(r => r.periodTotal > 0).sort((a, b) => {
        const ra = a.periodTotal ? a.answered / a.periodTotal : 0;
        const rb = b.periodTotal ? b.answered / b.periodTotal : 0;
        return rb - ra || b.answered - a.answered;
    })[0];

    const highestVolume = [...visibleRecords].sort((a, b) => b.periodTotal - a.periodTotal)[0];

    oversightEl.innerHTML = `
        <div class="p-3 bg-slate-950 border border-slate-800 rounded-lg">
            <span class="text-[10px] font-bold uppercase text-slate-400 block">Highest Log Volume (${escapeHtml(supervisorPeriod.toUpperCase())})</span>
            <span class="font-extrabold text-sm text-sky-300">${highestVolume && highestVolume.periodTotal > 0 ? `${escapeHtml(highestVolume.name)} (${highestVolume.periodTotal} logs)` : "No logs yet"}</span>
        </div>
        <div class="p-3 bg-slate-950 border border-slate-800 rounded-lg">
            <span class="text-[10px] font-bold uppercase text-slate-400 block">Top Response Rate</span>
            <span class="font-extrabold text-sm text-emerald-400">${topResponder ? `${escapeHtml(topResponder.name)} (${Math.round((topResponder.answered / topResponder.periodTotal) * 100)}% — ${topResponder.answered}/${topResponder.periodTotal})` : "No answered logs yet"}</span>
        </div>
        <div class="p-3 bg-slate-950 border border-slate-800 rounded-lg">
            <span class="text-[10px] font-bold uppercase text-slate-400 block">Supervisor Attention Needed</span>
            <span class="font-extrabold text-sm text-rose-400">${sumPending} Pending / Unanswered Ticket(s)</span>
            <p class="text-[11px] text-slate-400 mt-0.5">Review pending tickets in PAT/SMT Logs Sheet to ensure SLA compliance.</p>
        </div>
    `;

    tbody.innerHTML = visibleRecords.map(r => {
        const rate = r.periodTotal > 0 ? Math.round((r.answered / r.periodTotal) * 100) : 0;
        const rateBadgeColor = rate >= 80 ? "text-emerald-400" : rate >= 50 ? "text-amber-400" : "text-rose-400";
        return `
            <tr class="hover:bg-slate-800/40">
                <td class="font-bold text-white whitespace-nowrap">${escapeHtml(r.name)}</td>
                <td><span class="chip-pill">${escapeHtml(r.role)}</span></td>
                <td class="text-right font-mono">${r.daily}</td>
                <td class="text-right font-mono">${r.weekly}</td>
                <td class="text-right font-mono">${r.monthly}</td>
                <td class="text-right font-mono">${r.annual}</td>
                <td class="text-right font-mono font-bold text-sky-300">${r.periodTotal}</td>
                <td class="text-right font-mono font-bold text-emerald-400">${r.answered}</td>
                <td class="text-right font-mono font-bold text-rose-400">${r.pending}</td>
                <td class="text-right font-mono font-extrabold ${rateBadgeColor}">${rate}%</td>
            </tr>
        `;
    }).join("");
}

function exportCSV() {
    const rows = getFilteredTickets().map(({ t }) => t);
    const headers = [
        getColLabel('col_adminNo'),
        getColLabel('col_platform'),
        getColLabel('col_dateReceived'),
        getColLabel('col_referralNo'),
        getColLabel('col_complainantName'),
        getColLabel('col_category'),
        getColLabel('col_ticketType'),
        getColLabel('col_ticketDetails'),
        getColLabel('col_responseDetails'),
        getColLabel('col_actionTaken'),
        getColLabel('col_status'),
        getColLabel('col_remarks')
    ];
    const csvLines = [
        headers.map(h => `"${String(h).replace(/"/g, '""')}"`).join(","),
        ...rows.map(t => [
            t.adminNo, t.platform, formatCleanDate(t.dateReceived), t.referralNo,
            t.complainantName, t.category, t.ticketType, t.ticketDetails,
            t.responseDetails, t.actionTaken, t.status, t.remarks
        ].map(v => `"${String(v || '').replace(/"/g, '""')}"`).join(","))
    ];
    const blob = new Blob([csvLines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `LTO_PAT_SMT_Logs_${getTodayISO()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
}

function loadCustomAccomplishments() {
    try {
        const raw = localStorage.getItem(CUSTOM_ACCOMPLISHMENTS_KEY);
        if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) customAccomplishments = parsed;
        }
    } catch (e) {}
}

function saveCustomAccomplishments() {
    try {
        localStorage.setItem(CUSTOM_ACCOMPLISHMENTS_KEY, JSON.stringify(customAccomplishments || []));
    } catch (e) {}
}

function initAccomplishmentDefaults() {
    setAccomplishmentPreset('today');
    setSystemDateInputValue('customAccDateInput', getTodayISO());
    renderCustomAccomplishmentsManageList();
    generateAccomplishmentReport();
}

function setAccomplishmentPreset(preset) {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    const lastDay = new Date(y, m + 1, 0).getDate();

    let startIso = getTodayISO();
    let endIso = getTodayISO();

    if (preset === '1st_cutoff') {
        startIso = `${y}-${String(m + 1).padStart(2, '0')}-01`;
        endIso = `${y}-${String(m + 1).padStart(2, '0')}-15`;
    } else if (preset === '2nd_cutoff') {
        startIso = `${y}-${String(m + 1).padStart(2, '0')}-16`;
        endIso = `${y}-${String(m + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    } else if (preset === 'weekly') {
        const dStart = new Date(now);
        dStart.setDate(now.getDate() - 6);
        startIso = `${dStart.getFullYear()}-${String(dStart.getMonth() + 1).padStart(2, '0')}-${String(dStart.getDate()).padStart(2, '0')}`;
        endIso = getTodayISO();
    } else if (preset === 'monthly') {
        startIso = `${y}-${String(m + 1).padStart(2, '0')}-01`;
        endIso = `${y}-${String(m + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    }

    setSystemDateInputValue('accStartDate', startIso);
    setSystemDateInputValue('accEndDate', endIso);
    generateAccomplishmentReport();
}

function saveCustomAccomplishment(e) {
    e.preventDefault();
    const title = (document.getElementById('customAccTitleInput')?.value || '').trim();
    const dateIso = document.getElementById('customAccDateInput')?.value || getTodayISO();
    const editIdxStr = document.getElementById('editCustomAccIndex')?.value || '';
    if (!title) return;

    const item = {
        title,
        date: isoToMMDDYYYY(dateIso),
        owner: currentUser.adminNo || currentUser.name || currentUser.username
    };

    if (editIdxStr !== '') {
        const idx = parseInt(editIdxStr, 10);
        if (!isNaN(idx) && customAccomplishments[idx]) {
            customAccomplishments[idx] = item;
        }
    } else {
        customAccomplishments.push(item);
    }

    saveCustomAccomplishments();
    cancelEditCustomAccomplishment();
    renderCustomAccomplishmentsManageList();
    generateAccomplishmentReport();
    showToast("Accomplishment saved.");
}

function editCustomAccomplishment(idx) {
    const item = customAccomplishments[idx];
    if (!item) return;
    document.getElementById('editCustomAccIndex').value = String(idx);
    document.getElementById('customAccTitleInput').value = item.title || '';
    setSystemDateInputValue('customAccDateInput', mmddyyyyToISO(item.date || getTodayMMDDYYYY()));
    document.getElementById('accFormHeaderLabel').textContent = `✏️ Editing Accomplishment #${idx + 1}`;
    document.getElementById('btnSaveCustomAcc').textContent = "Update Accomplishment";
    document.getElementById('btnCancelEditAccItem').classList.remove('hidden');
}

function cancelEditCustomAccomplishment() {
    document.getElementById('editCustomAccIndex').value = '';
    document.getElementById('customAccTitleInput').value = '';
    setSystemDateInputValue('customAccDateInput', getTodayISO());
    document.getElementById('accFormHeaderLabel').textContent = "➕ Add Accomplishment (Auto-inserted after Portal Ticket List)";
    document.getElementById('btnSaveCustomAcc').textContent = "+ Add Accomplishment";
    document.getElementById('btnCancelEditAccItem').classList.add('hidden');
}

function deleteCustomAccomplishment(idx) {
    customAccomplishments.splice(idx, 1);
    saveCustomAccomplishments();
    renderCustomAccomplishmentsManageList();
    generateAccomplishmentReport();
}

function renderCustomAccomplishmentsManageList() {
    const el = document.getElementById('customAccomplishmentsManageList');
    if (!el) return;
    if (!customAccomplishments.length) {
        el.innerHTML = `<div class="text-slate-500 text-[11px]">No custom accomplishment items added yet.</div>`;
        return;
    }
    el.innerHTML = customAccomplishments.map((item, idx) => `
        <div class="flex items-center justify-between gap-2 bg-slate-900 border border-slate-800 rounded p-2">
            <div class="truncate">
                <span class="font-mono text-[10px] text-amber-300">[${escapeHtml(item.date || '')}]</span>
                <span class="text-slate-200 ml-1">${escapeHtml(item.title || '')}</span>
            </div>
            <div class="flex items-center gap-1 shrink-0">
                <button type="button" onclick="editCustomAccomplishment(${idx})" class="px-1.5 py-0.5 bg-sky-700 hover:bg-sky-600 text-white rounded text-[10px]">Edit</button>
                <button type="button" onclick="deleteCustomAccomplishment(${idx})" class="px-1.5 py-0.5 bg-rose-700 hover:bg-rose-600 text-white rounded text-[10px]">✕</button>
            </div>
        </div>
    `).join('');
}

function generateAccomplishmentReport() {
    const container = document.getElementById('accomplishmentReportContainer');
    if (!container) return;

    const startIso = document.getElementById('accStartDate')?.value || getTodayISO();
    const endIso = document.getElementById('accEndDate')?.value || getTodayISO();
    const scope = document.getElementById('accAdminScope')?.value || 'my';

    const sDate = new Date(startIso + "T00:00:00");
    const eDate = new Date(endIso + "T23:59:59");

    const filtered = (AppState.tickets || []).filter(t => {
        if (scope === 'my' && !isTicketOwnedByCurrentUser(t)) return false;
        const d = parseTicketDateObj(t.dateReceived);
        if (!d) return false;
        return d >= sDate && d <= eDate;
    });

    const totalCount = filtered.length;
    const closedCount = filtered.filter(t => String(t.status || '').toLowerCase() === 'closed').length;
    const pendingCount = filtered.filter(t => String(t.status || '').toLowerCase() === 'pending').length;

    const platformCounts = {};
    filtered.forEach(t => {
        const p = String(t.platform || 'OTHER').toUpperCase();
        platformCounts[p] = (platformCounts[p] || 0) + 1;
    });

    const platformBullets = Object.keys(platformCounts).length
        ? Object.keys(platformCounts).map(p => `<li><strong>${escapeHtml(p)}</strong>: ${platformCounts[p]} ticket(s) handled</li>`).join('')
        : `<li>No portal tickets logged within selected period.</li>`;

    const customBullets = customAccomplishments
        .filter(c => {
            const d = parseTicketDateObj(c.date);
            if (!d) return true;
            return d >= sDate && d <= eDate;
        })
        .map(c => `<li><strong>[${escapeHtml(c.date || '')}]</strong> ${escapeHtml(c.title || '')}</li>`)
        .join('');

    container.innerHTML = `
        <div id="printableAccomplishmentDoc" class="report-a4-page">
            <div class="space-y-4">
                ${buildStandardLetterHeaderHtml()}
                <div class="border-b border-slate-300 pb-2">
                    <h2 class="text-base font-extrabold text-slate-900 uppercase">Accomplishment Report — PAT / SMT</h2>
                    <p class="text-xs text-slate-600">Period: <strong>${escapeHtml(isoToMMDDYYYY(startIso))}</strong> to <strong>${escapeHtml(isoToMMDDYYYY(endIso))}</strong> | Operator: <strong>${escapeHtml(scope === 'all' ? 'All Admins Combined' : (currentUser.name || currentUser.username))}</strong></p>
                </div>

                <div class="grid grid-cols-3 gap-3 text-xs">
                    <div class="p-3 bg-slate-50 border border-slate-200 rounded">
                        <span class="text-[10px] font-bold uppercase text-slate-500 block">Total Tickets Handled</span>
                        <span class="text-lg font-extrabold text-slate-900">${totalCount}</span>
                    </div>
                    <div class="p-3 bg-emerald-50 border border-emerald-200 rounded">
                        <span class="text-[10px] font-bold uppercase text-emerald-700 block">Closed / Resolved</span>
                        <span class="text-lg font-extrabold text-emerald-800">${closedCount}</span>
                    </div>
                    <div class="p-3 bg-rose-50 border border-rose-200 rounded">
                        <span class="text-[10px] font-bold uppercase text-rose-700 block">Pending / Endorsed</span>
                        <span class="text-lg font-extrabold text-rose-800">${pendingCount}</span>
                    </div>
                </div>

                <div class="space-y-1.5 text-xs">
                    <h3 class="font-extrabold uppercase text-slate-800">Portal Ticketing Summary</h3>
                    <ul class="list-disc pl-5 space-y-1 text-slate-700">${platformBullets}</ul>
                </div>

                ${customBullets ? `
                <div class="space-y-1.5 text-xs">
                    <h3 class="font-extrabold uppercase text-slate-800">Additional Accomplishments</h3>
                    <ul class="list-disc pl-5 space-y-1 text-slate-700">${customBullets}</ul>
                </div>` : ''}

                <div class="overflow-x-auto pt-2">
                    <table class="report-table-clean text-[11px]">
                        <thead class="bg-slate-100 text-slate-800">
                            <tr>
                                <th class="p-1.5 text-left">${escapeHtml(getColLabel('col_dateReceived'))}</th>
                                <th class="p-1.5 text-left">${escapeHtml(getColLabel('col_platform'))}</th>
                                <th class="p-1.5 text-left">${escapeHtml(getColLabel('col_referralNo'))}</th>
                                <th class="p-1.5 text-left">${escapeHtml(getColLabel('col_complainantName'))}</th>
                                <th class="p-1.5 text-left">${escapeHtml(getColLabel('col_category'))}</th>
                                <th class="p-1.5 text-left">${escapeHtml(getColLabel('col_status'))}</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${filtered.length ? filtered.map(t => `
                                <tr>
                                    <td class="p-1.5 font-mono">${escapeHtml(formatCleanDate(t.dateReceived))}</td>
                                    <td class="p-1.5">${escapeHtml(t.platform || '')}</td>
                                    <td class="p-1.5 font-mono">${escapeHtml(t.referralNo || '')}</td>
                                    <td class="p-1.5">${escapeHtml(t.complainantName || '')}</td>
                                    <td class="p-1.5">${escapeHtml(t.category || '')}</td>
                                    <td class="p-1.5 font-bold">${escapeHtml(t.status || '')}</td>
                                </tr>
                            `).join('') : `<tr><td colspan="6" class="p-4 text-center text-slate-500">No logs for this period.</td></tr>`}
                        </tbody>
                    </table>
                </div>
            </div>

            <div class="pt-8 mt-6 border-t border-slate-200 flex justify-between text-xs text-slate-700 page-break-inside-avoid">
                <div>
                    <p class="text-[10px] uppercase font-bold text-slate-500 mb-4">Prepared By:</p>
                    <p class="font-extrabold uppercase text-slate-900">${escapeHtml(currentUser.name || currentUser.username)}</p>
                    <p class="text-[11px] text-slate-600">${escapeHtml(currentUser.adminNo || deriveOperatorAdminNo(currentUser) || 'CPAO Operator')}</p>
                </div>
                <div class="text-right">
                    <p class="text-[10px] uppercase font-bold text-slate-500 mb-4">Noted By:</p>
                    <p class="font-extrabold uppercase text-slate-900">${escapeHtml(AppState.settings.reportConfig?.notedName || 'MARY MAY M. JACOB')}</p>
                    <p class="text-[11px] text-slate-600">${escapeHtml(AppState.settings.reportConfig?.notedDesig || 'Head, LTO COMMS/CPAO')}</p>
                </div>
            </div>
        </div>
    `;
}

function toggleEditAccomplishmentPreview() {
    isAccomplishmentPreviewEditing = !isAccomplishmentPreviewEditing;
    const docEl = document.getElementById('printableAccomplishmentDoc');
    const btn = document.getElementById('btnToggleEditAccPreview');
    const badge = document.getElementById('accEditModeBadge');
    if (docEl) docEl.contentEditable = isAccomplishmentPreviewEditing ? 'true' : 'false';
    if (btn) btn.textContent = isAccomplishmentPreviewEditing ? '✅ Done Editing' : '✏️ Edit Report';
    if (badge) badge.classList.toggle('hidden', !isAccomplishmentPreviewEditing);
}

function printAccomplishmentReport() {
    document.body.classList.add('printing-accomplishment');
    window.print();
    setTimeout(() => document.body.classList.remove('printing-accomplishment'), 500);
}

// ============================================================================
// REPORTS GENERATOR (WITH CUSTOM COLUMN & GRAPH LABELS)
// ============================================================================
function populateReportFilterOptions() {
    const portalSel = document.getElementById('repFilterPortal');
    const catSel = document.getElementById('repFilterCategory');
    if (portalSel) {
        const selectedPortals = Array.from(portalSel.selectedOptions).map(o => o.value);
        portalSel.innerHTML = (AppState.settings.platforms || []).map(p =>
            `<option value="${escapeHtml(p.name)}" ${selectedPortals.includes(p.name) ? 'selected' : ''}>${escapeHtml(p.name)}</option>`
        ).join('');
    }
    if (catSel) {
        const selectedCats = Array.from(catSel.selectedOptions).map(o => o.value);
        const allCats = getAllCategoriesFlat();
        catSel.innerHTML = allCats.map(c =>
            `<option value="${escapeHtml(c.name)}" ${selectedCats.includes(c.name) ? 'selected' : ''}>${escapeHtml(c.name)}</option>`
        ).join('');
    }
}

function clearReportMultiSelect(selectId) {
    const sel = document.getElementById(selectId);
    if (!sel) return;
    Array.from(sel.options).forEach(o => { o.selected = false; });
    generateReport();
}

function setReportPreset(preset) {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    const lastDay = new Date(y, m + 1, 0).getDate();

    let startIso = `${y}-${String(m + 1).padStart(2, '0')}-01`;
    let endIso = `${y}-${String(m + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    if (preset === 'weekly') {
        const dStart = new Date(now);
        dStart.setDate(now.getDate() - 6);
        startIso = `${dStart.getFullYear()}-${String(dStart.getMonth() + 1).padStart(2, '0')}-${String(dStart.getDate()).padStart(2, '0')}`;
        endIso = getTodayISO();
    } else if (preset === 'semiannual') {
        const halfStartMonth = m < 6 ? 0 : 6;
        const halfEndMonth = m < 6 ? 5 : 11;
        const halfEndDay = new Date(y, halfEndMonth + 1, 0).getDate();
        startIso = `${y}-${String(halfStartMonth + 1).padStart(2, '0')}-01`;
        endIso = `${y}-${String(halfEndMonth + 1).padStart(2, '0')}-${String(halfEndDay).padStart(2, '0')}`;
    } else if (preset === 'annual') {
        startIso = `${y}-01-01`;
        endIso = `${y}-12-31`;
    }

    setSystemDateInputValue('repStartDate', startIso);
    setSystemDateInputValue('repEndDate', endIso);
    generateReport();
}

function generateReport() {
    const container = document.getElementById('reportResultsContainer');
    if (!container) return;

    const startIso = document.getElementById('repStartDate')?.value || `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-01`;
    const endIso = document.getElementById('repEndDate')?.value || getTodayISO();
    const sDate = new Date(startIso + "T00:00:00");
    const eDate = new Date(endIso + "T23:59:59");
    const startMdy = isoToMMDDYYYY(startIso);
    const endMdy = isoToMMDDYYYY(endIso);

    const selectedPortals = Array.from(document.getElementById('repFilterPortal')?.selectedOptions || []).map(o => o.value.toUpperCase());
    const selectedCats = Array.from(document.getElementById('repFilterCategory')?.selectedOptions || []).map(o => o.value.toLowerCase());
    const graphType = document.getElementById('repGraphTypeSelect')?.value || 'all';
    const hideEmpty = !!(document.getElementById('repHideEmptyCards')?.checked);
    const sigSel = document.getElementById('repPreparedBySelect')?.value || '0';

    const lblReceived = getColLabel('graph_received');
    const lblClosed = getColLabel('graph_closed');
    const lblPending = getColLabel('graph_pending');

    const rows = (AppState.tickets || []).filter(t => {
        const d = parseTicketDateObj(t.dateReceived);
        if (!d || d < sDate || d > eDate) return false;
        if (selectedPortals.length && !selectedPortals.includes(String(t.platform || '').toUpperCase())) return false;
        if (selectedCats.length && !selectedCats.includes(String(t.category || '').toLowerCase())) return false;
        return true;
    });

    const totalRec = rows.length;
    const totalClosed = rows.filter(t => String(t.status || '').toLowerCase() === 'closed').length;
    const totalPending = rows.filter(t => String(t.status || '').toLowerCase() === 'pending').length;
    const resRate = totalRec > 0 ? Math.round((totalClosed / totalRec) * 100) : 0;

    const portalScopeText = selectedPortals.length ? selectedPortals.join(", ") : "All";
    const catScopeText = selectedCats.length ? selectedCats.join(", ") : "All";

    // 1. PORTAL STATS
    const portalStats = {};
    (AppState.settings.platforms || []).forEach(p => {
        const key = String(p.name || '').toUpperCase();
        if (key) portalStats[key] = { name: p.name, received: 0, resolved: 0, pending: 0 };
    });
    rows.forEach(t => {
        const rawPlat = String(t.platform || 'OTHER').trim();
        const key = rawPlat.toUpperCase();
        if (!portalStats[key]) portalStats[key] = { name: rawPlat, received: 0, resolved: 0, pending: 0 };
        portalStats[key].received++;
        if (String(t.status || '').toLowerCase() === 'closed') portalStats[key].resolved++;
        if (String(t.status || '').toLowerCase() === 'pending') portalStats[key].pending++;
    });
    const portalList = Object.values(portalStats)
        .filter(p => !hideEmpty || p.received > 0)
        .sort((a, b) => b.received - a.received || a.name.localeCompare(b.name));
    const maxPortalRec = Math.max(1, ...portalList.map(p => p.received));

    // 2. CONCERN GROUP & CATEGORY STATS
    const groupStats = {};
    CATEGORY_GROUPS.forEach(grp => {
        groupStats[grp] = { group: grp, received: 0, resolved: 0, pending: 0, categories: {} };
        (AppState.settings.categoryGroups?.[grp] || []).forEach(catName => {
            groupStats[grp].categories[catName] = { category: catName, received: 0, resolved: 0, pending: 0 };
        });
    });

    rows.forEach(t => {
        const catName = String(t.category || 'Uncategorized').trim() || 'Uncategorized';
        const grpName = getGroupForCategory(catName);
        if (!groupStats[grpName]) {
            groupStats[grpName] = { group: grpName, received: 0, resolved: 0, pending: 0, categories: {} };
        }
        if (!groupStats[grpName].categories[catName]) {
            groupStats[grpName].categories[catName] = { category: catName, received: 0, resolved: 0, pending: 0 };
        }
        const isClo = String(t.status || '').toLowerCase() === 'closed';
        const isPen = String(t.status || '').toLowerCase() === 'pending';

        groupStats[grpName].received++;
        if (isClo) groupStats[grpName].resolved++;
        if (isPen) groupStats[grpName].pending++;

        groupStats[grpName].categories[catName].received++;
        if (isClo) groupStats[grpName].categories[catName].resolved++;
        if (isPen) groupStats[grpName].categories[catName].pending++;
    });

    const activeGroupList = Object.values(groupStats)
        .map(g => ({
            ...g,
            catRows: Object.values(g.categories)
                .filter(c => !hideEmpty || c.received > 0)
                .sort((a, b) => b.received - a.received || a.category.localeCompare(b.category))
        }))
        .filter(g => !hideEmpty || g.received > 0)
        .sort((a, b) => b.received - a.received);

    const maxGroupRec = Math.max(1, ...activeGroupList.map(g => g.received));
    const uniqueCatsCount = new Set(rows.map(t => String(t.category || '').trim()).filter(Boolean)).size;

    // 3. TOP 10 CONCERNS
    const allCatMap = {};
    rows.forEach(t => {
        const catName = String(t.category || 'Uncategorized').trim() || 'Uncategorized';
        const grpName = getGroupForCategory(catName);
        const key = catName.toLowerCase();
        if (!allCatMap[key]) {
            allCatMap[key] = { category: catName, group: grpName, volume: 0, resolved: 0, pending: 0 };
        }
        allCatMap[key].volume++;
        if (String(t.status || '').toLowerCase() === 'closed') allCatMap[key].resolved++;
        if (String(t.status || '').toLowerCase() === 'pending') allCatMap[key].pending++;
    });

    const sortedAllCats = Object.values(allCatMap).sort((a, b) => b.volume - a.volume || a.category.localeCompare(b.category));
    const top10Cats = sortedAllCats.slice(0, 10);
    const top10TotalVolume = top10Cats.reduce((sum, c) => sum + c.volume, 0);
    const maxTop10Vol = Math.max(1, ...top10Cats.map(c => c.volume));

    const monthNamesShort = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
    const tallyMonthLabel = `${monthNamesShort[eDate.getMonth()]} ${eDate.getFullYear()}`;
    const totalPages = 5;

    const cfg = AppState.settings.reportConfig || {};
    const logos = [cfg.logo1Url, cfg.logo2Url, cfg.logo3Url].filter(u => u && u.trim() !== "");
    const logosHtml = logos.length > 0
        ? `<div class="flex items-center gap-2 shrink-0">${logos.map(u => `<img src="${u}" class="h-11 w-auto object-contain" />`).join("")}</div>`
        : `<div class="flex items-center gap-1.5 shrink-0">
               <div class="w-10 h-10 rounded-full border-2 border-blue-900 bg-blue-50 flex items-center justify-center text-[9px] font-black text-blue-900">LTO</div>
               <div class="w-10 h-10 rounded-full border-2 border-amber-500 bg-amber-50 flex items-center justify-center text-[7px] font-extrabold text-amber-800 text-center leading-tight">BAGONG<br>PILIPINAS</div>
           </div>`;

    const buildSampleStyleHeader = (sectionTitle, pageNum) => `
        <div class="space-y-2.5">
            <div class="flex items-start justify-between gap-3 pb-2 border-b border-slate-300">
                <div class="flex items-center gap-3">
                    ${logosHtml}
                    <div class="text-left leading-tight">
                        <p class="text-[9px] font-bold text-slate-700 uppercase tracking-wider">${escapeHtml(cfg.republic || "Republic of the Philippines")}</p>
                        <p class="text-[9px] font-bold text-slate-700 uppercase tracking-wider">${escapeHtml(cfg.department || "Department of Transportation")}</p>
                        <p class="text-xs font-black text-slate-950 uppercase tracking-tight">${escapeHtml(cfg.agency || "LAND TRANSPORTATION OFFICE")}</p>
                        <p class="text-[9px] font-extrabold text-slate-800 uppercase tracking-wide">${escapeHtml(cfg.office || "STRATEGIC COMMUNICATIONS OFFICE & CENTRAL PUBLIC ASSISTANCE OFFICE (COMMS/CPAO)")}</p>
                    </div>
                </div>
                <div class="text-right shrink-0">
                    <span class="text-[8px] font-extrabold uppercase tracking-wider text-slate-500 block">PERIOD COVERED</span>
                    <span class="font-mono text-[10px] font-extrabold text-slate-900">${escapeHtml(startMdy)} — ${escapeHtml(endMdy)}</span>
                </div>
            </div>

            <div class="flex flex-wrap items-center justify-between gap-2 bg-slate-50 border border-slate-200 rounded px-3 py-2">
                <div>
                    <h2 class="text-xs font-black uppercase text-slate-950 tracking-wide">${escapeHtml(sectionTitle)}</h2>
                    <p class="text-[9px] text-slate-600 font-semibold">Active Scope: Portals: ${escapeHtml(portalScopeText)} • Categories: ${escapeHtml(catScopeText)}</p>
                </div>
                <div class="text-right">
                    <span class="text-[8px] font-extrabold uppercase text-slate-500 block">RESOLUTION RATE</span>
                    <span class="text-xs font-black text-emerald-700">${resRate}% <span class="font-mono text-[10px] text-slate-700">(${totalClosed}/${totalRec})</span></span>
                </div>
            </div>

            <div class="grid grid-cols-4 gap-2 text-xs">
                <div class="p-2 bg-slate-50 border border-slate-200 rounded">
                    <span class="text-[8px] font-extrabold uppercase text-slate-500 block">PORTALS</span>
                    <span class="text-sm font-black text-slate-900">${portalList.length}</span>
                </div>
                <div class="p-2 bg-slate-50 border border-slate-200 rounded">
                    <span class="text-[8px] font-extrabold uppercase text-slate-500 block">${escapeHtml(lblReceived.toUpperCase())}</span>
                    <span class="text-sm font-black text-slate-950">${totalRec}</span>
                </div>
                <div class="p-2 bg-emerald-50/70 border border-emerald-200 rounded">
                    <span class="text-[8px] font-extrabold uppercase text-emerald-700 block">RESOLVED</span>
                    <span class="text-sm font-black text-emerald-800">${totalClosed}</span>
                </div>
                <div class="p-2 bg-rose-50/70 border border-rose-200 rounded">
                    <span class="text-[8px] font-extrabold uppercase text-rose-700 block">${escapeHtml(lblPending.toUpperCase())}</span>
                    <span class="text-sm font-black text-rose-800">${totalPending}</span>
                </div>
            </div>
        </div>
    `;

    const buildSampleStyleFooter = (pageNum) => `
        <div class="pt-2.5 mt-3 border-t border-slate-200 flex items-center justify-between text-[9px] font-semibold text-slate-500">
            <span>${escapeHtml(cfg.office || "LTO CENTRAL PUBLIC ASSISTANCE OFFICE (CPAO)")}</span>
            <span class="font-mono font-bold text-slate-700">Page ${pageNum} of ${totalPages}</span>
        </div>
    `;

    const buildPieBlock = (slices, totalVal) => {
        const palette = ["#2563eb", "#0d9488", "#d97706", "#7c3aed", "#db2777", "#059669", "#4f46e5", "#ea580c", "#0284c7", "#65a30d"];
        if (!slices.length || totalVal <= 0) {
            return `<div class="text-xs text-slate-500 py-2">No chart data available for selected range.</div>`;
        }
        let acc = 0;
        const items = slices.map((s, idx) => {
            const color = palette[idx % palette.length];
            const pct = (s.value / totalVal) * 100;
            const start = acc.toFixed(2);
            acc += pct;
            const end = acc.toFixed(2);
            return { ...s, color, pct, stop: `${color} ${start}% ${end}%` };
        });
        const grad = `conic-gradient(${items.map(x => x.stop).join(", ")})`;
        return `
            <div class="flex flex-col sm:flex-row items-center gap-5">
                <div class="w-32 h-32 rounded-full shrink-0 flex items-center justify-center border border-slate-200" style="background: ${grad};">
                    <div class="w-16 h-16 rounded-full bg-white flex flex-col items-center justify-center text-center shadow-inner">
                        <span class="text-sm font-black text-slate-950 leading-none">${totalVal}</span>
                        <span class="text-[7px] font-extrabold uppercase text-slate-500 mt-0.5">TOTAL</span>
                    </div>
                </div>
                <div class="flex-1 w-full space-y-1">
                    ${items.map(it => `
                        <div class="report-pie-legend-row">
                            <span class="report-pie-legend-label">
                                <span class="w-2.5 h-2.5 rounded-sm inline-block shrink-0" style="background:${it.color}"></span>
                                <span>${escapeHtml(it.label)}</span>
                            </span>
                            <span class="report-pie-legend-val">${it.value} (${it.pct.toFixed(1)}%)</span>
                        </div>
                    `).join("")}
                </div>
            </div>
        `;
    };

    const notedName = escapeHtml(cfg.notedName || "MARY MAY M. JACOB");
    const notedDesig = escapeHtml(cfg.notedDesig || "Head, LTO COMMS/CPAO");

    const sigHtml = sigSel === 'all'
        ? `<div class="pt-5 mt-5 border-t border-slate-300 page-break-inside-avoid space-y-5 text-xs text-slate-900">
            <div>
                <p class="text-[9px] font-extrabold uppercase tracking-wider text-slate-500 mb-4">Prepared by:</p>
                <div class="grid grid-cols-3 gap-4">
                    ${REPORT_SIGNATORIES.map(s => `
                        <div>
                            <div class="border-b border-slate-400 pb-1 mb-1 font-extrabold uppercase text-[10px] text-slate-950">${escapeHtml(s.name)}</div>
                            <div class="text-[9px] text-slate-600 font-semibold">${escapeHtml(s.designation)}</div>
                        </div>
                    `).join('')}
                </div>
            </div>
            <div>
                <p class="text-[9px] font-extrabold uppercase tracking-wider text-slate-500 mb-4">Noted / Approved by:</p>
                <div class="max-w-xs">
                    <div class="border-b border-slate-400 pb-1 mb-1 font-extrabold uppercase text-[11px] text-slate-950">${notedName}</div>
                    <div class="text-[10px] text-slate-700 font-semibold">${notedDesig}</div>
                </div>
            </div>
        </div>`
        : (() => {
            const s = REPORT_SIGNATORIES[parseInt(sigSel, 10)] || REPORT_SIGNATORIES[0];
            return `<div class="pt-5 mt-5 border-t border-slate-300 page-break-inside-avoid flex flex-col sm:flex-row justify-between gap-6 text-xs text-slate-900">
                <div>
                    <p class="text-[9px] font-extrabold uppercase tracking-wider text-slate-500 mb-5">Prepared by:</p>
                    <div class="border-b border-slate-400 pb-1 mb-1 font-extrabold uppercase text-[11px] text-slate-950 min-w-[210px]">${escapeHtml(s.name)}</div>
                    <div class="text-[10px] text-slate-600 font-semibold">${escapeHtml(s.designation)}</div>
                </div>
                <div>
                    <p class="text-[9px] font-extrabold uppercase tracking-wider text-slate-500 mb-5">Noted / Approved by:</p>
                    <div class="border-b border-slate-400 pb-1 mb-1 font-extrabold uppercase text-[11px] text-slate-950 min-w-[210px]">${notedName}</div>
                    <div class="text-[10px] text-slate-700 font-semibold">${notedDesig}</div>
                </div>
            </div>`;
        })();

    const page1 = `
        <div class="report-a4-page">
            <div class="space-y-3">
                ${buildSampleStyleHeader("REPORT I — EXECUTIVE SUMMARY & PORTAL BREAKDOWN", 1)}

                <div class="report-card-avoid-break bg-white space-y-2">
                    <h3 class="text-[11px] font-black uppercase text-slate-900">I. BREAKDOWN PER PORTAL</h3>
                    <table class="report-table-clean text-[10px]">
                        <thead class="bg-slate-100 text-slate-900">
                            <tr>
                                <th class="p-1.5 text-left">PORTAL</th>
                                <th class="p-1.5 text-right">${escapeHtml(lblReceived.toUpperCase())}</th>
                                <th class="p-1.5 text-right">RESOLVED</th>
                                <th class="p-1.5 text-right">${escapeHtml(lblPending.toUpperCase())}</th>
                                <th class="p-1.5 text-right">EFFICIENCY</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${portalList.length ? portalList.map(p => {
                                const eff = p.received > 0 ? Math.round((p.resolved / p.received) * 100) : 0;
                                return `
                                    <tr>
                                        <td class="p-1.5 font-bold text-slate-900">${escapeHtml(p.name)}</td>
                                        <td class="p-1.5 text-right font-mono font-bold">${p.received}</td>
                                        <td class="p-1.5 text-right font-mono text-emerald-700 font-bold">${p.resolved}</td>
                                        <td class="p-1.5 text-right font-mono text-rose-700 font-bold">${p.pending}</td>
                                        <td class="p-1.5 text-right font-mono font-extrabold text-slate-900">${eff}%</td>
                                    </tr>
                                `;
                            }).join("") : `<tr><td colspan="5" class="p-3 text-center text-slate-500">No portal records found.</td></tr>`}
                        </tbody>
                    </table>
                </div>

                ${(graphType === 'all' || graphType === 'bar') ? `
                <div class="report-card-avoid-break bg-white space-y-2 pt-1">
                    <h3 class="text-[11px] font-black uppercase text-slate-900">PORTAL VOLUME BAR GRAPH</h3>
                    <div class="space-y-1.5">
                        ${portalList.map(p => {
                            const pct = Math.round((p.received / maxPortalRec) * 100);
                            return `
                                <div class="grid grid-cols-12 items-center gap-2 text-[10px]">
                                    <span class="col-span-3 font-bold text-slate-800 truncate">${escapeHtml(p.name)}</span>
                                    <div class="col-span-8 bg-slate-100 h-3.5 rounded overflow-hidden">
                                        <div class="bg-blue-600 h-full rounded" style="width:${pct}%"></div>
                                    </div>
                                    <span class="col-span-1 text-right font-mono font-extrabold text-slate-900">${p.received}</span>
                                </div>
                            `;
                        }).join("")}
                    </div>
                </div>` : ""}

                ${(graphType === 'all' || graphType === 'pie') ? `
                <div class="report-card-avoid-break bg-white space-y-2 pt-2 border-t border-slate-100">
                    <h3 class="text-[11px] font-black uppercase text-slate-900">PORTAL DISTRIBUTION PIE GRAPH</h3>
                    ${buildPieBlock(portalList.map(p => ({ label: p.name, value: p.received })), totalRec)}
                </div>` : ""}
            </div>
            ${buildSampleStyleFooter(1)}
        </div>
    `;

    const page2 = `
        <div class="report-a4-page">
            <div class="space-y-3">
                ${buildSampleStyleHeader("REPORT II — CATEGORIZED BREAKDOWN BY CONCERN DIVISION / GROUP", 2)}

                ${(graphType === 'all' || graphType === 'bar') ? `
                <div class="report-card-avoid-break bg-white space-y-2">
                    <h3 class="text-[11px] font-black uppercase text-slate-900">II. CATEGORIZED BREAKDOWN BY CONCERN DIVISION / GROUP — CONCERN GROUP BAR GRAPH</h3>
                    <div class="space-y-1.5">
                        ${activeGroupList.map(g => {
                            const pct = Math.round((g.received / maxGroupRec) * 100);
                            return `
                                <div class="grid grid-cols-12 items-center gap-2 text-[10px]">
                                    <span class="col-span-4 font-bold text-slate-800 truncate">${escapeHtml(g.group)}</span>
                                    <div class="col-span-7 bg-slate-100 h-3.5 rounded overflow-hidden">
                                        <div class="bg-sky-700 h-full rounded" style="width:${pct}%"></div>
                                    </div>
                                    <span class="col-span-1 text-right font-mono font-extrabold text-slate-900">${g.received}</span>
                                </div>
                            `;
                        }).join("")}
                    </div>
                </div>` : ""}

                <div class="space-y-2.5">
                    ${activeGroupList.map(g => `
                        <div class="report-card-avoid-break bg-white space-y-1.5">
                            <div class="flex items-center justify-between text-[10px] font-black uppercase text-slate-900 pt-1">
                                <span>${escapeHtml(g.group)}</span>
                                <span class="font-mono">Total: ${g.received}</span>
                            </div>
                            <table class="report-table-clean text-[10px]">
                                <thead class="bg-slate-100 text-slate-900">
                                    <tr>
                                        <th class="p-1 text-left">CATEGORY</th>
                                        <th class="p-1 text-right">${escapeHtml(lblReceived.toUpperCase())}</th>
                                        <th class="p-1 text-right">RESOLVED</th>
                                        <th class="p-1 text-right">${escapeHtml(lblPending.toUpperCase())}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${g.catRows.length ? g.catRows.map(c => `
                                        <tr>
                                            <td class="p-1 text-slate-900">${escapeHtml(c.category)}</td>
                                            <td class="p-1 text-right font-mono font-bold">${c.received}</td>
                                            <td class="p-1 text-right font-mono text-emerald-700 font-bold">${c.resolved}</td>
                                            <td class="p-1 text-right font-mono text-rose-700 font-bold">${c.pending}</td>
                                        </tr>
                                    `).join("") : `<tr><td colspan="4" class="p-1.5 text-center text-slate-400">No entries in this group.</td></tr>`}
                                </tbody>
                            </table>
                        </div>
                    `).join("")}
                </div>
            </div>
            ${buildSampleStyleFooter(2)}
        </div>
    `;

    const page3 = `
        <div class="report-a4-page">
            <div class="space-y-3">
                ${buildSampleStyleHeader("REPORT II — CONCERN GROUP PIE GRAPH", 3)}
                <div class="report-card-avoid-break bg-white space-y-2.5">
                    <h3 class="text-[11px] font-black uppercase text-slate-900">CONCERN GROUP PIE GRAPH</h3>
                    ${buildPieBlock(activeGroupList.map(g => ({ label: g.group, value: g.received })), totalRec)}
                </div>
            </div>
            ${buildSampleStyleFooter(3)}
        </div>
    `;

    const page4 = `
        <div class="report-a4-page">
            <div class="space-y-3">
                ${buildSampleStyleHeader("REPORT III — TOP 10 CONCERNS SUMMARY", 4)}

                <div class="report-card-avoid-break bg-white space-y-2">
                    <h3 class="text-[11px] font-black uppercase text-slate-900">III. TOP 10 CONCERNS</h3>
                    <table class="report-table-clean text-[10px]">
                        <thead class="bg-slate-100 text-slate-900">
                            <tr>
                                <th class="p-1 text-left">RANK</th>
                                <th class="p-1 text-left">CATEGORY</th>
                                <th class="p-1 text-left">GROUP</th>
                                <th class="p-1 text-right">VOLUME</th>
                                <th class="p-1 text-right">RESOLVED</th>
                                <th class="p-1 text-right">PENDING</th>
                                <th class="p-1 text-right">SHARE</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${top10Cats.length ? top10Cats.map((c, idx) => {
                                const share = totalRec > 0 ? ((c.volume / totalRec) * 100).toFixed(1) : "0.0";
                                return `
                                    <tr>
                                        <td class="p-1 font-mono font-extrabold text-slate-900">#${idx + 1}</td>
                                        <td class="p-1 font-bold text-slate-900">${escapeHtml(c.category)}</td>
                                        <td class="p-1 text-slate-700">${escapeHtml(c.group)}</td>
                                        <td class="p-1 text-right font-mono font-bold">${c.volume}</td>
                                        <td class="p-1 text-right font-mono text-emerald-700 font-bold">${c.resolved}</td>
                                        <td class="p-1 text-right font-mono text-rose-700 font-bold">${c.pending}</td>
                                        <td class="p-1 text-right font-mono font-extrabold">${share}%</td>
                                    </tr>
                                `;
                            }).join("") : `<tr><td colspan="7" class="p-3 text-center text-slate-500">No concern records found.</td></tr>`}
                        </tbody>
                    </table>
                </div>

                ${(graphType === 'all' || graphType === 'bar') ? `
                <div class="report-card-avoid-break bg-white space-y-1.5 pt-1">
                    <h3 class="text-[11px] font-black uppercase text-slate-900">TOP 10 CONCERNS BAR GRAPH</h3>
                    <div class="space-y-1">
                        ${top10Cats.map((c, idx) => {
                            const pct = Math.round((c.volume / maxTop10Vol) * 100);
                            return `
                                <div class="grid grid-cols-12 items-center gap-2 text-[10px]">
                                    <span class="col-span-5 font-semibold text-slate-800 truncate">#${idx + 1}: ${escapeHtml(c.category)}</span>
                                    <div class="col-span-6 bg-slate-100 h-3 rounded overflow-hidden">
                                        <div class="bg-indigo-600 h-full rounded" style="width:${pct}%"></div>
                                    </div>
                                    <span class="col-span-1 text-right font-mono font-extrabold text-slate-900">${c.volume}</span>
                                </div>
                            `;
                        }).join("")}
                    </div>
                </div>` : ""}

                ${(graphType === 'all' || graphType === 'pie') ? `
                <div class="report-card-avoid-break bg-white space-y-2 pt-2 border-t border-slate-100">
                    <h3 class="text-[11px] font-black uppercase text-slate-900">TOP 10 CONCERNS PIE GRAPH</h3>
                    ${buildPieBlock(top10Cats.map((c, idx) => ({ label: `#${idx + 1} ${c.category}`, value: c.volume })), top10TotalVolume)}
                </div>` : ""}
            </div>
            ${buildSampleStyleFooter(4)}
        </div>
    `;

    const page5 = `
        <div class="report-a4-page">
            <div class="space-y-3">
                ${buildSampleStyleHeader("REPORT IV — MONTHLY TALLY BREAKDOWN", 5)}

                <div class="report-card-avoid-break bg-white space-y-2">
                    <h3 class="text-[11px] font-black uppercase text-slate-900">IV. MONTHLY TALLY BREAKDOWN</h3>
                    <table class="report-table-clean text-[10px]">
                        <thead class="bg-slate-100 text-slate-900">
                            <tr>
                                <th class="p-1 text-left">CATEGORY</th>
                                <th class="p-1 text-right">${escapeHtml(tallyMonthLabel)}</th>
                                <th class="p-1 text-right">TOTAL</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${sortedAllCats.length ? sortedAllCats.map(c => `
                                <tr>
                                    <td class="p-1 text-slate-900">${escapeHtml(c.category)}</td>
                                    <td class="p-1 text-right font-mono font-bold">${c.volume}</td>
                                    <td class="p-1 text-right font-mono font-extrabold text-slate-950">${c.volume}</td>
                                </tr>
                            `).join("") : `<tr><td colspan="3" class="p-3 text-center text-slate-500">No tally records found.</td></tr>`}
                        </tbody>
                    </table>
                </div>

                ${sigHtml}
            </div>
            ${buildSampleStyleFooter(5)}
        </div>
    `;

    container.innerHTML = `<div id="printableReportDocument" class="space-y-6">${page1}${page2}${page3}${page4}${page5}</div>`;
}

function printReport() {
    document.body.classList.add('printing-report');
    window.print();
    setTimeout(() => document.body.classList.remove('printing-report'), 500);
}

function exportReportCSV() {
    const startIso = document.getElementById('repStartDate')?.value || getTodayISO();
    const endIso = document.getElementById('repEndDate')?.value || getTodayISO();
    const sDate = new Date(startIso + "T00:00:00");
    const eDate = new Date(endIso + "T23:59:59");
    const rows = (AppState.tickets || []).filter(t => {
        const d = parseTicketDateObj(t.dateReceived);
        return d && d >= sDate && d <= eDate;
    });
    const lines = [
        [getColLabel('col_dateReceived'), getColLabel('col_platform'), getColLabel('col_referralNo'), getColLabel('col_complainantName'), getColLabel('col_category'), getColLabel('col_status')].map(h => `"${String(h).replace(/"/g, '""')}"`).join(','),
        ...rows.map(t => [formatCleanDate(t.dateReceived), t.platform, t.referralNo, t.complainantName, t.category, t.status].map(v => `"${String(v || '').replace(/"/g, '""')}"`).join(','))
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `CPAO_Report_${startIso}_to_${endIso}.csv`;
    a.click();
    URL.revokeObjectURL(url);
}

// ============================================================================
// WORKFLOW, CLIPBOARD & WORKDAY CALCULATOR
// ============================================================================
function runWorkflow() {
    const val = document.getElementById('wfType')?.value || 'Simple';
    const out = document.getElementById('wfOutput');
    if (!out) return;
    if (val === 'Complex') {
        out.textContent = "Due Limit: 7 Working Days (Complex Transaction)";
    } else if (val === 'Highly Technical') {
        out.textContent = "Due Limit: 20 Working Days (Highly Technical / Endorsement)";
    } else {
        out.textContent = "Due Limit: 3 Working Days (Simple Transaction)";
    }
}

function renderClipboardSnippets() {
    const grid = document.getElementById('snippetsGrid');
    if (!grid) return;
    const list = AppState.templates || [];
    grid.innerHTML = list.map((item, idx) => `
        <div class="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3 text-xs">
            <div class="flex items-center justify-between">
                <span class="font-extrabold text-amber-400 uppercase">${escapeHtml(item.title || 'Snippet')}</span>
                <button type="button" onclick="copySnippetText(${idx})" class="px-2.5 py-1 bg-sky-600 hover:bg-sky-500 text-white rounded font-bold text-[11px]">Copy</button>
            </div>
            <p class="text-slate-300 leading-relaxed whitespace-pre-line">${escapeHtml(item.text || '')}</p>
        </div>
    `).join('');
}

function copySnippetText(idx) {
    const item = AppState.templates[idx];
    if (!item) return;
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(item.text || '').catch(() => {});
    }
    showToast("Copied response snippet to clipboard.");
}

function isNonWorkingDate(isoStr) {
    const d = new Date(isoStr + "T12:00:00");
    if (isNaN(d.getTime())) return true;
    const day = d.getDay();
    if (day === 0 || day === 6) return true;
    return (AppState.toggledOffDates || []).includes(isoStr);
}

function runWorkdayCalculator() {
    const startIso = document.getElementById('calcStartDate')?.value || getTodayISO();
    const workDays = parseInt(document.getElementById('calcDays')?.value || '3', 10);
    const resEl = document.getElementById('calcResults');
    if (!resEl) return;

    let cursor = new Date(startIso + "T12:00:00");
    if (isNaN(cursor.getTime())) cursor = new Date();

    let counted = 0;
    let safety = 0;
    while (counted < workDays && safety < 365) {
        cursor.setDate(cursor.getDate() + 1);
        const cIso = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}-${String(cursor.getDate()).padStart(2, '0')}`;
        if (!isNonWorkingDate(cIso)) {
            counted++;
        }
        safety++;
    }

    const dueIso = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}-${String(cursor.getDate()).padStart(2, '0')}`;
    resEl.textContent = `Target Resolution Date: ${isoToMMDDYYYY(dueIso)} (${workDays} Working Days)`;
}

function changeCalcMonth(dir) {
    calcCurrentMonth += dir;
    if (calcCurrentMonth > 11) { calcCurrentMonth = 0; calcCurrentYear++; }
    if (calcCurrentMonth < 0) { calcCurrentMonth = 11; calcCurrentYear--; }
    renderCalcCalendar();
}

function toggleCalendarOffDate(isoStr) {
    if (!canUserEditWorkdayOffDates()) return;
    const d = new Date(isoStr + "T12:00:00");
    if (d.getDay() === 0 || d.getDay() === 6) return;
    const idx = AppState.toggledOffDates.indexOf(isoStr);
    if (idx >= 0) {
        AppState.toggledOffDates.splice(idx, 1);
    } else {
        AppState.toggledOffDates.push(isoStr);
    }
    saveOffDatesStorage(true);
    renderCalcCalendar();
    runWorkdayCalculator();
}

function clearAllOffDates() {
    if (!canUserEditWorkdayOffDates()) return;
    AppState.toggledOffDates = [];
    saveOffDatesStorage(true);
    renderCalcCalendar();
    runWorkdayCalculator();
}

function renderSavedOffDatesSummary() {
    const badge = document.getElementById('offDatesCountBadge');
    const listEl = document.getElementById('savedOffDatesList');
    const list = AppState.toggledOffDates || [];
    if (badge) badge.textContent = `${list.length} Off Dates Saved`;
    if (listEl) {
        if (!list.length) {
            listEl.innerHTML = `<span class="text-slate-500 text-[11px]">No extra non-working dates marked.</span>`;
        } else {
            listEl.innerHTML = list.map(iso => `
                <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-950/80 border border-rose-800/60 text-rose-200 font-mono text-[10px]">
                    ${escapeHtml(isoToMMDDYYYY(iso))}
                    <button type="button" onclick="toggleCalendarOffDate('${iso}')" class="off-date-remove-btn text-rose-400 hover:text-white font-bold">✕</button>
                </span>
            `).join('');
        }
    }
}

function renderCalcCalendar() {
    const grid = document.getElementById('calcCalendarGrid');
    const label = document.getElementById('calcMonthLabel');
    if (!grid || !label) return;

    const monthsNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    label.textContent = `${monthsNames[calcCurrentMonth]} ${calcCurrentYear}`;

    let html = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d =>
        `<div class="text-[10px] font-extrabold text-slate-500 py-1">${d}</div>`
    ).join('');

    const firstDay = new Date(calcCurrentYear, calcCurrentMonth, 1).getDay();
    const totalDays = new Date(calcCurrentYear, calcCurrentMonth + 1, 0).getDate();

    for (let i = 0; i < firstDay; i++) html += `<div></div>`;
    for (let day = 1; day <= totalDays; day++) {
        const iso = `${calcCurrentYear}-${String(calcCurrentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const d = new Date(iso + "T12:00:00");
        const isWeekend = d.getDay() === 0 || d.getDay() === 6;
        const isOff = (AppState.toggledOffDates || []).includes(iso);

        let cls = "bg-slate-950 text-slate-200 border border-slate-800 hover:border-sky-500";
        if (isWeekend) {
            cls = "bg-slate-900/50 text-slate-500 border border-slate-800/60";
        } else if (isOff) {
            cls = "bg-rose-950/80 text-rose-300 border border-rose-700";
        }
        html += `<button type="button" onclick="toggleCalendarOffDate('${iso}')" class="calc-date-toggle-btn p-1.5 rounded-lg text-[11px] font-mono font-bold transition ${cls}">${day}</button>`;
    }
    grid.innerHTML = html;
}

let endorseAttachments = [];
let endorseShowAttachmentLabels = true;

function renderDirectoryTable() {
    ensureDirectoryOfficialsInitialized();
    const tbody = document.getElementById('directoryTableBody');
    if (!tbody) return;

    tbody.innerHTML = (AppState.directory || []).map((item, idx) => `
        <tr onclick="selectDirectoryRow(${idx})" class="cursor-pointer ${idx === selectedDirectoryIndex ? 'bg-sky-950/30' : 'hover:bg-slate-800/40'}">
            <td class="font-bold text-white">${escapeHtml(item.office || '')}</td>
            <td class="font-mono text-amber-300">${escapeHtml(item.code || '')}</td>
            <td>${escapeHtml(item.chief || '')}</td>
            <td class="text-center whitespace-nowrap space-x-1">
                <button type="button" onclick="event.stopPropagation(); openRegionOfficialsPage(${idx})" class="px-2.5 py-1 bg-sky-600 hover:bg-sky-500 text-white rounded text-[10px] font-bold">Edit Officials</button>
                <button type="button" onclick="event.stopPropagation(); openDirectoryModal(${idx})" class="px-2 py-1 bg-slate-700 hover:bg-slate-600 text-white rounded text-[10px] font-bold">Edit</button>
                <button type="button" onclick="event.stopPropagation(); deleteDirectoryEntry(${idx})" class="px-2 py-1 bg-rose-700 hover:bg-rose-600 text-white rounded text-[10px] font-bold">Del</button>
            </td>
        </tr>
    `).join('');

    renderSelectedDirectoryDetails();
}

function selectDirectoryRow(idx) {
    selectedDirectoryIndex = idx;
    renderDirectoryTable();
}

function renderSelectedDirectoryDetails() {
    const detailBody = document.getElementById('directoryDetailTableBody');
    const titleEl = document.getElementById('selectedRegionDetailsTitle');
    if (!detailBody) return;
    const item = AppState.directory[selectedDirectoryIndex] || AppState.directory[0];
    if (!item) {
        detailBody.innerHTML = `<tr><td colspan="8" class="p-4 text-center text-slate-500">No region selected.</td></tr>`;
        return;
    }
    if (titleEl) titleEl.textContent = `${item.office || 'Region'} (${item.code || ''}) — Directory Details`;
    detailBody.innerHTML = `
        <tr>
            <td class="font-mono text-amber-300">${escapeHtml(item.code || '')}</td>
            <td class="font-bold text-white">${escapeHtml(item.office || '')}</td>
            <td>${escapeHtml(item.chief || '')}</td>
            <td>${escapeHtml(item.position || '')}</td>
            <td>${escapeHtml(item.address || '')}</td>
            <td class="font-mono">${escapeHtml(item.number || '')}</td>
            <td class="text-sky-300">${escapeHtml(item.email || '')}</td>
            <td class="text-center">
                <button type="button" onclick="openRegionOfficialsPage(${selectedDirectoryIndex})" class="px-2.5 py-1 bg-sky-600 hover:bg-sky-500 text-white rounded text-[10px] font-bold">Officials (${(item.officials || []).length})</button>
            </td>
        </tr>
    `;
}

function openDirectoryModal(index = null) {
    const modal = document.getElementById('directoryModal');
    if (!modal) return;
    if (index === null || index === undefined) {
        document.getElementById('directoryModalTitle').textContent = "Add LTO Directory Office";
        document.getElementById('editDirectoryIndex').value = "";
        document.getElementById('dirAgencyCode').value = "";
        document.getElementById('dirOfficeName').value = "";
        document.getElementById('dirChiefName').value = "";
        document.getElementById('dirPosition').value = "Regional Director";
        document.getElementById('dirAddress').value = "";
        document.getElementById('dirNumber').value = "";
        document.getElementById('dirEmail').value = "";
    } else {
        const item = AppState.directory[index];
        if (!item) return;
        document.getElementById('directoryModalTitle').textContent = "Edit LTO Directory Office";
        document.getElementById('editDirectoryIndex').value = String(index);
        document.getElementById('dirAgencyCode').value = item.code || "";
        document.getElementById('dirOfficeName').value = item.office || "";
        document.getElementById('dirChiefName').value = item.chief || "";
        document.getElementById('dirPosition').value = item.position || "Regional Director";
        document.getElementById('dirAddress').value = item.address || "";
        document.getElementById('dirNumber').value = item.number || "";
        document.getElementById('dirEmail').value = item.email || "";
    }
    modal.style.display = 'flex';
}

function closeDirectoryModal() {
    const modal = document.getElementById('directoryModal');
    if (modal) modal.style.display = 'none';
}

function saveDirectoryForm(e) {
    e.preventDefault();
    const idxStr = document.getElementById('editDirectoryIndex').value;
    const entry = {
        code: document.getElementById('dirAgencyCode').value.trim(),
        office: document.getElementById('dirOfficeName').value.trim(),
        chief: document.getElementById('dirChiefName').value.trim(),
        position: document.getElementById('dirPosition').value.trim(),
        address: document.getElementById('dirAddress').value.trim(),
        number: document.getElementById('dirNumber').value.trim(),
        email: document.getElementById('dirEmail').value.trim(),
        officials: idxStr !== "" ? (AppState.directory[parseInt(idxStr, 10)]?.officials || []) : []
    };
    if (idxStr !== "") {
        const idx = parseInt(idxStr, 10);
        AppState.directory[idx] = { ...AppState.directory[idx], ...entry };
    } else {
        AppState.directory.push(entry);
    }
    closeDirectoryModal();
    renderDirectoryTable();
    showToast("Directory office saved.");
}

function deleteDirectoryEntry(idx) {
    AppState.directory.splice(idx, 1);
    if (selectedDirectoryIndex >= AppState.directory.length) selectedDirectoryIndex = 0;
    renderDirectoryTable();
}

function openRegionOfficialsPage(regionIndex) {
    activeOfficialsRegionIndex = regionIndex;
    const region = AppState.directory[regionIndex];
    if (!region) return;
    document.getElementById('regionOfficialsPageTitle').textContent = `👔 ${region.office || 'Region'} Officials`;
    document.getElementById('regionOfficialsPageSubtitle').textContent = `${region.address || ''} | ${region.email || ''}`;
    renderRegionOfficialsTable();
    switchMainTab('directoryOfficials');
}

function backToDirectoryFromOfficials() {
    switchMainTab('directory');
}

function renderRegionOfficialsTable() {
    const tbody = document.getElementById('regionOfficialsTableBody');
    if (!tbody) return;
    const list = getRegionOfficialsList(activeOfficialsRegionIndex);
    tbody.innerHTML = list.length ? list.map((off, idx) => `
        <tr>
            <td><span class="chip-pill">${escapeHtml(off.roleRank || 'Chief')}</span></td>
            <td class="font-bold text-white uppercase">${escapeHtml(off.name || '')}</td>
            <td>${escapeHtml(off.position || '')}</td>
            <td>${escapeHtml(off.division || '')}</td>
            <td class="text-sky-300">${escapeHtml(off.email || '')}</td>
            <td class="font-mono">${escapeHtml(off.number || '')}</td>
            <td class="text-center space-x-1">
                <button type="button" onclick="openOfficialModal(${idx})" class="px-2 py-1 bg-sky-600 text-white rounded text-[10px] font-bold">Edit</button>
                <button type="button" onclick="deleteOfficialEntry(${idx})" class="px-2 py-1 bg-rose-600 text-white rounded text-[10px] font-bold">Del</button>
            </td>
        </tr>
    `).join('') : `<tr><td colspan="7" class="p-4 text-center text-slate-500">No officials listed for this region.</td></tr>`;
}

function openOfficialModal(idx = null) {
    const modal = document.getElementById('officialModal');
    if (!modal) return;
    const list = getRegionOfficialsList(activeOfficialsRegionIndex);
    if (idx === null || idx === undefined) {
        document.getElementById('officialModalTitle').textContent = "Add Regional Official";
        document.getElementById('editOfficialIndex').value = "";
        populateOfficialRoleRankDropdown("Chief");
        document.getElementById('offPosition').value = "Regional Director";
        document.getElementById('offChiefName').value = "";
        document.getElementById('offDivision').value = "";
        document.getElementById('offNumber').value = "";
        document.getElementById('offEmail').value = "";
    } else {
        const off = list[idx];
        if (!off) return;
        document.getElementById('officialModalTitle').textContent = "Edit Regional Official";
        document.getElementById('editOfficialIndex').value = String(idx);
        populateOfficialRoleRankDropdown(off.roleRank || "Chief");
        document.getElementById('offPosition').value = off.position || "";
        document.getElementById('offChiefName').value = off.name || "";
        document.getElementById('offDivision').value = off.division || "";
        document.getElementById('offNumber').value = off.number || "";
        document.getElementById('offEmail').value = off.email || "";
    }
    modal.style.display = 'flex';
}

function closeOfficialModal() {
    const modal = document.getElementById('officialModal');
    if (modal) modal.style.display = 'none';
}

function saveOfficialForm(e) {
    e.preventDefault();
    const list = getRegionOfficialsList(activeOfficialsRegionIndex);
    const idxStr = document.getElementById('editOfficialIndex').value;
    const obj = {
        roleRank: document.getElementById('offRoleRank').value,
        position: document.getElementById('offPosition').value.trim(),
        name: document.getElementById('offChiefName').value.trim().toUpperCase(),
        division: document.getElementById('offDivision').value.trim(),
        number: document.getElementById('offNumber').value.trim(),
        email: document.getElementById('offEmail').value.trim()
    };
    if (idxStr !== "") {
        list[parseInt(idxStr, 10)] = obj;
    } else {
        list.push(obj);
    }
    closeOfficialModal();
    renderRegionOfficialsTable();
    renderDirectoryTable();
}

function deleteOfficialEntry(idx) {
    const list = getRegionOfficialsList(activeOfficialsRegionIndex);
    list.splice(idx, 1);
    renderRegionOfficialsTable();
    renderDirectoryTable();
}

function resetDefaultEndorsementTemplate() {
    AppState.settings.endorsementForm = { ...STANDARD_ENDORSEMENT_TEMPLATE_FIELDS };
    persistLocalSettingsCache();
    populateEndorsementFormInputs();
    updateTemplateLivePreview();
    showToast("Endorsement template reset to default.");
}

function saveEndorsementTemplate() {
    syncFormTemplateFields();
    saveAllSettingsToCloud(true);
    showToast("Endorsement template saved.");
}

function updateTemplateLivePreview() {
    const prev = document.getElementById('templateLivePreview');
    if (!prev) return;
    const sampleData = {
        todayDate: formatDayMonthYear(new Date()),
        chiefName: "ELMER J. DECENA",
        chiefLastName: "DECENA",
        chiefPosition: "Regional Director",
        agencyName: "Land Transportation Office",
        officeName: "Regional Office 4-A",
        officeAddress: "Lipa City, Batangas",
        rdmpaoEmail: "dmsacltocalabarzon@gmail.com",
        complainantName: "Juan Dela Cruz",
        complainantEmail: "juandelacruz@email.com",
        platform: "FACEBOOK",
        forwardedClause: "",
        dateReceivedFormatted: formatDayMonthYear(new Date()),
        dueDate: formatDayMonthYear(new Date(Date.now() + 28 * 86400000)),
        ticketRefNo: "CPAO-20261124-001",
        ticketSubjectTerm: "complaint",
        briefDescription: "regarding vehicle registration follow-up",
        includeShowCause: false,
        attachmentHtml: ""
    };
    prev.innerHTML = renderStandardEndorsementLetterHtml(sampleData);
}

// Endorsement Letter Modal & Attachments
function openEndorseModal(index) {
    const t = AppState.tickets[index];
    if (!t) return;
    ensureDirectoryOfficialsInitialized();
    endorseAttachments = [];
    renderEndorseAttachmentsList();

    document.getElementById('endorseTicketIndex').value = String(index);
    const offSel = document.getElementById('endOfficeSelect');
    offSel.innerHTML = (AppState.directory || []).map((d, idx) =>
        `<option value="${idx}">${escapeHtml(d.office)} (${escapeHtml(d.code)})</option>`
    ).join('');
    offSel.value = "0";
    onRegionDirectorySelect("0");

    document.getElementById('endComplainantName').value = t.complainantName || "";
    document.getElementById('endComplainantEmail').value = "";
    document.getElementById('endBriefDescription').value = t.ticketDetails || "";

    setEndorsementEditState(false);
    document.getElementById('endorseModal').style.display = 'flex';
}

function closeEndorseModal(discardDraft = false) {
    if (discardDraft) endorseAttachments = [];
    const modal = document.getElementById('endorseModal');
    if (modal) modal.style.display = 'none';
}

function onRegionDirectorySelect(regionIdxStr) {
    const idx = parseInt(regionIdxStr, 10) || 0;
    const reg = AppState.directory[idx];
    if (!reg) return;

    const chiefSel = document.getElementById('endChiefNameSelect');
    const officials = getRegionOfficialsList(idx);
    if (chiefSel) {
        chiefSel.innerHTML = officials.length
            ? officials.map((o, i) => `<option value="${i}">${escapeHtml(o.name)} — ${escapeHtml(o.position || o.roleRank || '')}</option>`).join('')
            : `<option value="">${escapeHtml(reg.chief || '')}</option>`;
    }

    document.getElementById('endChiefName').value = reg.chief || "";
    document.getElementById('endPosition').value = reg.position || "Regional Director";
    document.getElementById('endAgencyName').value = "Land Transportation Office";
    document.getElementById('endEmailAddress').value = reg.email || "";
    document.getElementById('endOfficeAddress').value = reg.address || "";
    document.getElementById('endRdmpaoEmail').value = reg.email || "";
}

function onEndorseChiefDropdownChange(offIdxStr) {
    const regIdx = parseInt(document.getElementById('endOfficeSelect')?.value || '0', 10) || 0;
    const officials = getRegionOfficialsList(regIdx);
    const off = officials[parseInt(offIdxStr, 10) || 0];
    if (!off) return;
    document.getElementById('endChiefName').value = off.name || "";
    if (off.position) document.getElementById('endPosition').value = off.position;
    if (off.email) document.getElementById('endEmailAddress').value = off.email;
}

function triggerEndorseFilePicker() {
    document.getElementById('endAttachmentFiles')?.click();
}

function handleEndorseDragOver(e) {
    e.preventDefault();
    document.getElementById('endAttachmentDropzone')?.classList.add('border-sky-400');
}

function handleEndorseDragLeave(e) {
    e.preventDefault();
    document.getElementById('endAttachmentDropzone')?.classList.remove('border-sky-400');
}

function handleEndorseFilesDrop(e) {
    e.preventDefault();
    document.getElementById('endAttachmentDropzone')?.classList.remove('border-sky-400');
    if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length) {
        processSelectedEndorseFiles(Array.from(e.dataTransfer.files));
    }
}

function handleEndorseFilesSelected(e) {
    if (e.target && e.target.files && e.target.files.length) {
        processSelectedEndorseFiles(Array.from(e.target.files));
        e.target.value = "";
    }
}

async function processSelectedEndorseFiles(files) {
    for (const file of files) {
        if (file.type && file.type.startsWith("image/")) {
            const dataUrl = await new Promise((resolve) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result);
                reader.readAsDataURL(file);
            });
            endorseAttachments.push({
                id: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
                name: file.name,
                kind: "image",
                dataUrl
            });
        } else if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
            const arrayBuffer = await file.arrayBuffer();
            if (window.pdfjsLib) {
                const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
                for (let p = 1; p <= pdf.numPages; p++) {
                    const page = await pdf.getPage(p);
                    const viewport = page.getViewport({ scale: 1.5 });
                    const canvas = document.createElement("canvas");
                    canvas.width = viewport.width;
                    canvas.height = viewport.height;
                    await page.render({ canvasContext: canvas.getContext("2d"), viewport }).promise;
                    endorseAttachments.push({
                        id: `${Date.now()}_${p}_${Math.random().toString(36).slice(2, 6)}`,
                        name: `${file.name} (Page ${p}/${pdf.numPages})`,
                        kind: "pdf_page",
                        dataUrl: canvas.toDataURL("image/jpeg", 0.9)
                    });
                }
            }
        }
    }
    renderEndorseAttachmentsList();
}

function clearAllEndorseAttachments() {
    endorseAttachments = [];
    renderEndorseAttachmentsList();
}

function moveEndorseAttachment(idx, delta) {
    const target = idx + delta;
    if (target < 0 || target >= endorseAttachments.length) return;
    const temp = endorseAttachments[idx];
    endorseAttachments[idx] = endorseAttachments[target];
    endorseAttachments[target] = temp;
    renderEndorseAttachmentsList();
}

function removeEndorseAttachment(idx) {
    endorseAttachments.splice(idx, 1);
    renderEndorseAttachmentsList();
}

function applyEndorseAttachmentArrange(mode) {
    if (mode === "name_asc") {
        endorseAttachments.sort((a, b) => a.name.localeCompare(b.name));
    } else if (mode === "name_desc") {
        endorseAttachments.sort((a, b) => b.name.localeCompare(a.name));
    } else if (mode === "images_first") {
        endorseAttachments.sort((a, b) => (a.kind === "image" ? -1 : 1) - (b.kind === "image" ? -1 : 1));
    } else if (mode === "pdfs_first") {
        endorseAttachments.sort((a, b) => (a.kind === "pdf_page" ? -1 : 1) - (b.kind === "pdf_page" ? -1 : 1));
    }
    renderEndorseAttachmentsList();
}

function onEndorseLayoutModeChange() {
    renderEndorseAttachmentsList();
}

function renderEndorseAttachmentsList() {
    const container = document.getElementById('endAttachmentListContainer');
    const bar = document.getElementById('endAttachmentArrangeBar');
    const clearBtn = document.getElementById('btnClearEndorseAttachments');
    if (!container) return;

    if (bar) bar.classList.toggle('hidden', endorseAttachments.length === 0);
    if (clearBtn) clearBtn.classList.toggle('hidden', endorseAttachments.length === 0);

    if (!endorseAttachments.length) {
        container.innerHTML = '';
        return;
    }

    container.innerHTML = endorseAttachments.map((att, idx) => `
        <div class="flex items-center justify-between gap-2 bg-slate-900 border border-slate-800 rounded-lg p-2 text-[11px]">
            <div class="flex items-center gap-2 min-w-0">
                <img src="${att.dataUrl}" class="w-8 h-8 object-cover rounded border border-slate-700 shrink-0">
                <span class="truncate text-slate-200 font-semibold">${escapeHtml(att.name)}</span>
            </div>
            <div class="flex items-center gap-1 shrink-0">
                <button type="button" onclick="moveEndorseAttachment(${idx}, -1)" class="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 rounded">↑</button>
                <button type="button" onclick="moveEndorseAttachment(${idx}, 1)" class="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 rounded">↓</button>
                <button type="button" onclick="removeEndorseAttachment(${idx})" class="px-1.5 py-0.5 bg-rose-700 hover:bg-rose-600 text-white rounded">✕</button>
            </div>
        </div>
    `).join('');
}

function buildEndorsementAttachmentsHtml() {
    if (!endorseAttachments.length) return "";
    const layoutMode = document.getElementById('endAttachmentLayoutMode')?.value || 'page_per_item';
    return endorseAttachments.map((att, i) => {
        const breakClass = layoutMode === 'page_per_item' ? 'endorse-attachment-page-break' : 'mt-4 pt-3 border-t border-slate-200';
        const labelHtml = endorseShowAttachmentLabels
            ? `<p class="text-[11px] font-bold text-slate-600 mb-2">Attachment ${i + 1}: ${escapeHtml(att.name)}</p>`
            : "";
        return `
            <div class="${breakClass}">
                <div class="endorse-attachment-item-card border border-slate-200 rounded-lg p-3 bg-slate-50">
                    ${labelHtml}
                    <img src="${att.dataUrl}" class="max-w-full h-auto mx-auto rounded">
                </div>
            </div>
        `;
    }).join('');
}

function toggleEndorseAttachmentLabels() {
    endorseShowAttachmentLabels = !endorseShowAttachmentLabels;
    const btn = document.getElementById('btnToggleEndorseAttachmentLabels');
    if (btn) btn.textContent = `🏷️ File Labels: ${endorseShowAttachmentLabels ? 'ON' : 'OFF'}`;
    const area = document.getElementById('endorseLetterPrintArea');
    if (area && area.dataset.lastDataMap) {
        try {
            const dm = JSON.parse(area.dataset.lastDataMap);
            dm.attachmentHtml = buildEndorsementAttachmentsHtml();
            area.innerHTML = renderStandardEndorsementLetterHtml(dm);
        } catch (e) {}
    }
}

function generateEndorsementLetter(e) {
    e.preventDefault();
    const ticketIdx = parseInt(document.getElementById('endorseTicketIndex')?.value || '0', 10) || 0;
    const ticket = AppState.tickets[ticketIdx] || {};
    const regIdx = parseInt(document.getElementById('endOfficeSelect')?.value || '0', 10) || 0;
    const reg = AppState.directory[regIdx] || {};

    const chiefName = document.getElementById('endChiefName').value.trim();
    const chiefParts = chiefName.trim().split(/\s+/);
    const chiefLastName = chiefParts.length > 0 ? chiefParts[chiefParts.length - 1] : chiefName;

    const sigType = document.querySelector('input[name="sigType"]:checked')?.value || 'esign';
    const formCfg = getEndorsementFormConfig();

    const sigBlock = sigType === 'manual'
        ? `<div class="h-14"></div>
           <p class="font-extrabold uppercase text-xs text-slate-900">${escapeHtml(formCfg.sigName)}</p>
           <p class="text-slate-800 text-xs">${escapeHtml(formCfg.sigTitle)}</p>
           <p class="text-slate-700 text-xs">${escapeHtml(formCfg.sigOffice)}</p>`
        : `<div class="font-bold text-xs text-slate-800 pl-6 mb-1">[SIGNED]</div>
           <p class="font-extrabold uppercase text-xs text-slate-900">${escapeHtml(formCfg.sigName)}</p>
           <p class="text-slate-800 text-xs">${escapeHtml(formCfg.sigTitle)}</p>
           <p class="text-slate-700 text-xs">${escapeHtml(formCfg.sigOffice)}</p>`;

    const dataMap = {
        todayDate: formatDayMonthYear(new Date()),
        chiefName: escapeHtml(chiefName),
        chiefLastName: escapeHtml(chiefLastName),
        chiefPosition: escapeHtml(document.getElementById('endPosition').value.trim()),
        agencyName: escapeHtml(document.getElementById('endAgencyName').value.trim()),
        officeName: escapeHtml(reg.office || ''),
        officeAddress: escapeHtml(document.getElementById('endOfficeAddress').value.trim()),
        rdmpaoEmail: escapeHtml(document.getElementById('endRdmpaoEmail').value.trim() || reg.email || ''),
        complainantName: escapeHtml(document.getElementById('endComplainantName').value.trim()),
        complainantEmail: escapeHtml(document.getElementById('endComplainantEmail').value.trim()),
        platform: escapeHtml(ticket.platform || 'FACEBOOK'),
        forwardedClause: "",
        dateReceivedFormatted: formatDayMonthYear(ticket.dateReceived),
        dueDate: formatDayMonthYear(new Date(Date.now() + 28 * 86400000)),
        ticketRefNo: escapeHtml(ticket.referralNo || ''),
        ticketSubjectTerm: escapeHtml(resolveTicketSubjectTerm(ticket)),
        briefDescription: escapeHtml(document.getElementById('endBriefDescription').value.trim()),
        includeShowCause: isTrafficViolationConcern(ticket),
        signatureBlock: sigBlock,
        attachmentHtml: buildEndorsementAttachmentsHtml()
    };

    const printArea = document.getElementById('endorseLetterPrintArea');
    const fontCls = document.getElementById('endFontFamily')?.value || 'font-sans';
    if (printArea) {
        printArea.className = `p-8 sm:p-12 overflow-y-auto flex-1 text-xs sm:text-sm leading-relaxed space-y-6 outline-none ${fontCls}`;
        printArea.dataset.lastDataMap = JSON.stringify({ ...dataMap, attachmentHtml: "" });
        printArea.innerHTML = renderStandardEndorsementLetterHtml(dataMap);
    }

    const lblBtn = document.getElementById('btnToggleEndorseAttachmentLabels');
    if (lblBtn) lblBtn.classList.toggle('hidden', endorseAttachments.length === 0);

    setEndorsementEditState(false);
    document.getElementById('endorsePreviewModal').style.display = 'flex';
}

function closeEndorsePreviewModal() {
    setEndorsementEditState(false);
    const modal = document.getElementById('endorsePreviewModal');
    if (modal) modal.style.display = 'none';
}

function printEndorsementLetter() {
    document.body.classList.add('printing-endorse');
    window.print();
    setTimeout(() => document.body.classList.remove('printing-endorse'), 500);
}

// ============================================================================
// USER ACCOUNTS (INSTANT SYNC ON ADD / EDIT / DELETE)
// ============================================================================
function renderUsersTable() {
    const tbody = document.getElementById('userTableBody');
    if (!tbody) return;

    tbody.innerHTML = (AppState.users || []).map((u, idx) => {
        const privs = [
            u.canReports ? "Reports" : null,
            u.canDeleteLogs ? "Delete Logs" : null,
            u.canManageUsers ? "Manage Users" : null,
            u.canAccessSettings ? "Settings" : null
        ].filter(Boolean).join(", ") || "Standard";

        const colorSwatch = (u.logColor && u.logColor !== "Default")
            ? `<span class="inline-flex items-center gap-1.5 font-mono text-[11px]"><span class="w-3.5 h-3.5 rounded border border-white/30 inline-block" style="background:${escapeHtml(u.logColor)}"></span>${escapeHtml(u.logColor)}</span>`
            : `<span class="text-slate-500 text-[11px]">Default</span>`;

        return `
            <tr class="hover:bg-slate-800/40">
                <td class="font-mono font-bold text-amber-300">${escapeHtml(u.username || '')}</td>
                <td class="font-semibold text-white">${escapeHtml(u.name || '')}</td>
                <td><span class="chip-pill">${escapeHtml(u.role || 'Admin')}</span></td>
                <td>${escapeHtml(u.defaultPortal || 'FACEBOOK')}</td>
                <td class="text-slate-300">${escapeHtml(privs)}</td>
                <td>${colorSwatch}</td>
                <td class="font-mono text-slate-400">••••</td>
                <td class="text-center whitespace-nowrap space-x-1">
                    <button type="button" onclick="openUserModal(${idx})" class="px-2 py-1 bg-sky-600 hover:bg-sky-500 text-white rounded text-[10px] font-bold">Edit</button>
                    <button type="button" onclick="deleteUserAccount(${idx})" class="px-2 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded text-[10px] font-bold">Delete</button>
                </td>
            </tr>
        `;
    }).join('');
}

function openUserModal(idx = null) {
    populateDropdowns();
    const modal = document.getElementById('userModal');
    if (!modal) return;
    if (idx === null || idx === undefined) {
        document.getElementById('userModalTitle').textContent = "Create User Account";
        document.getElementById('editUserIndex').value = "";
        document.getElementById('formUsername').value = "";
        document.getElementById('formFullName').value = "";
        document.getElementById('formUserRole').value = "Admin";
        document.getElementById('formUserPass').value = "";
        if (document.getElementById('formUserDefaultPortal').options.length > 0) document.getElementById('formUserDefaultPortal').selectedIndex = 0;
        document.getElementById('formUserPortalStart').value = "";
        document.getElementById('formUserPortalEnd').value = "";
        document.getElementById('formCanReports').checked = false;
        document.getElementById('formCanDeleteLogs').checked = false;
        document.getElementById('formCanManageUsers').checked = false;
        document.getElementById('formCanAccessSettings').checked = false;
        document.getElementById('formEnableCustomColor').checked = false;
        document.getElementById('formUserLogColor').value = "#9a4e2a";
        document.getElementById('formUserLogColor').disabled = true;
    } else {
        const u = AppState.users[idx];
        if (!u) return;
        document.getElementById('userModalTitle').textContent = `Edit User Account (${u.username})`;
        document.getElementById('editUserIndex').value = String(idx);
        document.getElementById('formUsername').value = u.username || "";
        document.getElementById('formFullName').value = u.name || "";
        document.getElementById('formUserRole').value = u.role || "Admin";
        document.getElementById('formUserPass').value = u.pass || "";
        document.getElementById('formUserDefaultPortal').value = u.defaultPortal || "FACEBOOK";
        document.getElementById('formUserPortalStart').value = u.portalStart || "";
        document.getElementById('formUserPortalEnd').value = u.portalEnd || "";
        document.getElementById('formCanReports').checked = !!u.canReports;
        document.getElementById('formCanDeleteLogs').checked = !!u.canDeleteLogs;
        document.getElementById('formCanManageUsers').checked = !!u.canManageUsers;
        document.getElementById('formCanAccessSettings').checked = !!u.canAccessSettings;
        const hasColor = !!(u.logColor && u.logColor !== "Default");
        document.getElementById('formEnableCustomColor').checked = hasColor;
        document.getElementById('formUserLogColor').value = hasColor ? u.logColor : "#9a4e2a";
        document.getElementById('formUserLogColor').disabled = !hasColor;
    }
    modal.style.display = 'flex';
}

function closeUserModal() {
    const modal = document.getElementById('userModal');
    if (modal) modal.style.display = 'none';
}

function toggleColorPicker(enabled) {
    const picker = document.getElementById('formUserLogColor');
    if (picker) picker.disabled = !enabled;
}

async function saveUserForm(e) {
    e.preventDefault();
    const idxStr = document.getElementById('editUserIndex').value;
    const enableColor = document.getElementById('formEnableCustomColor').checked;
    const roleVal = document.getElementById('formUserRole').value;
    const isAdminSVRole = String(roleVal).toLowerCase() === "adminsv";

    const userObj = {
        username: document.getElementById('formUsername').value.trim(),
        name: document.getElementById('formFullName').value.trim(),
        role: roleVal,
        pass: document.getElementById('formUserPass').value.trim(),
        defaultPortal: document.getElementById('formUserDefaultPortal').value,
        portalStart: document.getElementById('formUserPortalStart').value,
        portalEnd: document.getElementById('formUserPortalEnd').value,
        canReports: isAdminSVRole ? true : document.getElementById('formCanReports').checked,
        canDeleteLogs: isAdminSVRole ? false : document.getElementById('formCanDeleteLogs').checked,
        canManageUsers: isAdminSVRole ? false : document.getElementById('formCanManageUsers').checked,
        canAccessSettings: isAdminSVRole ? false : document.getElementById('formCanAccessSettings').checked,
        logColor: enableColor ? document.getElementById('formUserLogColor').value : "Default"
    };

    if (idxStr !== "") {
        const idx = parseInt(idxStr, 10);
        AppState.users[idx] = { ...AppState.users[idx], ...userObj };
    } else {
        AppState.users.push(userObj);
    }

    closeUserModal();
    renderUsersTable();
    renderTable();
    await syncUsersToCloud(true);
    showToast("User account saved & synced with Google Sheets.");
}

async function deleteUserAccount(idx) {
    const targetUser = AppState.users[idx];
    if (!targetUser) return;
    if (String(targetUser.username || '').toLowerCase() === String(currentUser.username || '').toLowerCase()) {
        showSystemAlert("Action Blocked", "You cannot delete the currently active logged-in account.", "⚠️");
        return;
    }

    showSystemConfirm(
        "Delete User Account",
        `Delete account "${targetUser.username}" (${targetUser.name || ''})? Changes will sync to Google Sheets immediately.`,
        async () => {
            AppState.users.splice(idx, 1);
            renderUsersTable();
            renderTable();
            await syncUsersToCloud(true);
            showToast(`Account "${targetUser.username}" deleted and synced.`);
        },
        "🗑️"
    );
}

// ============================================================================
// SETTINGS TABLES & MODAL
// ============================================================================
function renderSettingsTables() {
    ensureCategoryGroupsInitialized();

    const qPlat = (document.getElementById('searchSettingsPlatforms')?.value || '').trim().toLowerCase();
    const platBody = document.getElementById('tablePlatformsBody');
    if (platBody) {
        const list = (AppState.settings.platforms || []).map((p, idx) => ({ p, idx })).filter(({ p }) =>
            !qPlat || String(p.name || '').toLowerCase().includes(qPlat) || String(p.prefix || '').toLowerCase().includes(qPlat)
        );
        platBody.innerHTML = list.map(({ p, idx }) => `
            <tr>
                <td class="font-bold text-white">${escapeHtml(p.name || '')}</td>
                <td class="font-mono text-amber-300">${escapeHtml(p.prefix || '')}</td>
                <td class="text-center">${p.autoGen ? '<span class="text-emerald-400 font-bold">AUTO</span>' : '<span class="text-slate-400">MANUAL</span>'}</td>
                <td class="text-center whitespace-nowrap space-x-1">
                    <button type="button" onclick="openSettingModal('platforms', ${idx})" class="px-2 py-0.5 bg-sky-700 hover:bg-sky-600 text-white rounded text-[10px] font-bold">Edit</button>
                    <button type="button" onclick="deleteSettingItem('platforms', ${idx})" class="px-2 py-0.5 bg-rose-700 hover:bg-rose-600 text-white rounded text-[10px] font-bold">Del</button>
                </td>
            </tr>
        `).join('');
    }

    const qCat = (document.getElementById('searchSettingsCategories')?.value || '').trim().toLowerCase();
    const catBody = document.getElementById('tableCategoriesBody');
    if (catBody) {
        const rows = [];
        CATEGORY_GROUPS.forEach(grp => {
            (AppState.settings.categoryGroups[grp] || []).forEach((cName, cIdx) => {
                if (!qCat || cName.toLowerCase().includes(qCat) || grp.toLowerCase().includes(qCat)) {
                    rows.push({ grp, cName, cIdx });
                }
            });
        });
        catBody.innerHTML = rows.length ? rows.map(r => `
            <tr>
                <td>
                    <div class="font-bold text-white">${escapeHtml(r.cName)}</div>
                    <div class="text-[10px] text-amber-400">${escapeHtml(r.grp)}</div>
                </td>
                <td class="text-center whitespace-nowrap space-x-1">
                    <button type="button" onclick="openSettingModal('categories', '${escapeHtml(r.grp)}', ${r.cIdx})" class="px-2 py-0.5 bg-sky-700 hover:bg-sky-600 text-white rounded text-[10px] font-bold">Edit</button>
                    <button type="button" onclick="deleteCategoryItem('${escapeHtml(r.grp)}', ${r.cIdx})" class="px-2 py-0.5 bg-rose-700 hover:bg-rose-600 text-white rounded text-[10px] font-bold">Del</button>
                </td>
            </tr>
        `).join('') : `<tr><td colspan="2" class="p-4 text-center text-slate-500">No categories configured yet.</td></tr>`;
    }

    const qType = (document.getElementById('searchSettingsTicketTypes')?.value || '').trim().toLowerCase();
    const typeBody = document.getElementById('tableTicketTypesBody');
    if (typeBody) {
        const list = (AppState.settings.ticketTypes || []).map((t, idx) => ({ t, idx })).filter(({ t }) =>
            !qType || String(t).toLowerCase().includes(qType)
        );
        typeBody.innerHTML = list.map(({ t, idx }) => `
            <tr>
                <td class="text-white">${escapeHtml(t)}</td>
                <td class="text-center whitespace-nowrap space-x-1">
                    <button type="button" onclick="openSettingModal('ticketTypes', ${idx})" class="px-2 py-0.5 bg-sky-700 hover:bg-sky-600 text-white rounded text-[10px] font-bold">Edit</button>
                    <button type="button" onclick="deleteSettingItem('ticketTypes', ${idx})" class="px-2 py-0.5 bg-rose-700 hover:bg-rose-600 text-white rounded text-[10px] font-bold">Del</button>
                </td>
            </tr>
        `).join('');
    }

    const qAct = (document.getElementById('searchSettingsActionsTaken')?.value || '').trim().toLowerCase();
    const actBody = document.getElementById('tableActionsTakenBody');
    if (actBody) {
        const list = (AppState.settings.actionsTaken || []).map((a, idx) => ({ a, idx })).filter(({ a }) =>
            !qAct || String(a).toLowerCase().includes(qAct)
        );
        actBody.innerHTML = list.map(({ a, idx }) => `
            <tr>
                <td class="text-white">${escapeHtml(a)}</td>
                <td class="text-center whitespace-nowrap space-x-1">
                    <button type="button" onclick="openSettingModal('actionsTaken', ${idx})" class="px-2 py-0.5 bg-sky-700 hover:bg-sky-600 text-white rounded text-[10px] font-bold">Edit</button>
                    <button type="button" onclick="deleteSettingItem('actionsTaken', ${idx})" class="px-2 py-0.5 bg-rose-700 hover:bg-rose-600 text-white rounded text-[10px] font-bold">Del</button>
                </td>
            </tr>
        `).join('');
    }
}

function openSettingModal(type, arg1 = null, arg2 = null) {
    const modal = document.getElementById('settingItemModal');
    const fieldsEl = document.getElementById('settingModalFieldsContainer');
    if (!modal || !fieldsEl) return;

    document.getElementById('settingModalType').value = type;

    if (type === 'platforms') {
        const idx = arg1;
        document.getElementById('settingModalIndex').value = (idx !== null && idx !== undefined) ? String(idx) : "";
        const item = (idx !== null && idx !== undefined) ? AppState.settings.platforms[idx] : { name: "", prefix: "CPAO", autoGen: true };
        document.getElementById('settingModalTitle').textContent = (idx !== null && idx !== undefined) ? "Edit Platform" : "Add Platform";
        fieldsEl.innerHTML = `
            <div>
                <label class="block text-slate-400 text-[10px] font-bold uppercase mb-1">Platform Name</label>
                <input type="text" id="setPlatName" required value="${escapeHtml(item.name || '')}" class="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white">
            </div>
            <div>
                <label class="block text-slate-400 text-[10px] font-bold uppercase mb-1">Ticket Prefix</label>
                <input type="text" id="setPlatPrefix" required value="${escapeHtml(item.prefix || 'CPAO')}" class="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white font-mono">
            </div>
            <label class="flex items-center gap-2 text-xs text-slate-200">
                <input type="checkbox" id="setPlatAutoGen" ${item.autoGen !== false ? 'checked' : ''}> Auto-generate ticket number
            </label>
        `;
    } else if (type === 'categories') {
        ensureCategoryGroupsInitialized();
        const grpInit = typeof arg1 === "string" ? arg1 : CATEGORY_GROUPS[0];
        const cIdx = (typeof arg2 === "number") ? arg2 : -1;
        const existingName = cIdx >= 0 ? (AppState.settings.categoryGroups[grpInit]?.[cIdx] || '') : '';
        document.getElementById('settingModalIndex').value = cIdx >= 0 ? `${grpInit}|||${cIdx}` : "";
        document.getElementById('settingModalTitle').textContent = cIdx >= 0 ? "Edit Category" : "Add Category";
        fieldsEl.innerHTML = `
            <div>
                <label class="block text-slate-400 text-[10px] font-bold uppercase mb-1">Concern Group</label>
                <select id="setCatGroup" class="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white">
                    ${CATEGORY_GROUPS.map(g => `<option value="${escapeHtml(g)}" ${g === grpInit ? 'selected' : ''}>${escapeHtml(g)}</option>`).join('')}
                </select>
            </div>
            <div>
                <label class="block text-slate-400 text-[10px] font-bold uppercase mb-1">Category Name</label>
                <input type="text" id="setCatName" required value="${escapeHtml(existingName)}" class="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white">
            </div>
        `;
    } else {
        const idx = arg1;
        document.getElementById('settingModalIndex').value = (idx !== null && idx !== undefined) ? String(idx) : "";
        const val = (idx !== null && idx !== undefined) ? AppState.settings[type][idx] : "";
        document.getElementById('settingModalTitle').textContent = (idx !== null && idx !== undefined) ? "Edit Option" : "Add Option";
        fieldsEl.innerHTML = `
            <div>
                <label class="block text-slate-400 text-[10px] font-bold uppercase mb-1">Label / Value</label>
                <input type="text" id="setSingleVal" required value="${escapeHtml(val || '')}" class="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white">
            </div>
        `;
    }

    modal.style.display = 'flex';
}

function closeSettingModal() {
    const modal = document.getElementById('settingItemModal');
    if (modal) modal.style.display = 'none';
}

function saveSettingItemForm(e) {
    e.preventDefault();
    const type = document.getElementById('settingModalType').value;
    const idxVal = document.getElementById('settingModalIndex').value;

    if (type === 'platforms') {
        const obj = {
            name: document.getElementById('setPlatName').value.trim().toUpperCase(),
            prefix: document.getElementById('setPlatPrefix').value.trim().toUpperCase() || "CPAO",
            autoGen: document.getElementById('setPlatAutoGen').checked
        };
        if (idxVal !== "") AppState.settings.platforms[parseInt(idxVal, 10)] = obj;
        else AppState.settings.platforms.push(obj);
    } else if (type === 'categories') {
        ensureCategoryGroupsInitialized();
        const grp = document.getElementById('setCatGroup').value;
        const name = document.getElementById('setCatName').value.trim();
        if (idxVal && idxVal.includes("|||")) {
            const [oldGrp, oldIdxStr] = idxVal.split("|||");
            const oldIdx = parseInt(oldIdxStr, 10);
            if (AppState.settings.categoryGroups[oldGrp]) AppState.settings.categoryGroups[oldGrp].splice(oldIdx, 1);
        }
        if (!Array.isArray(AppState.settings.categoryGroups[grp])) AppState.settings.categoryGroups[grp] = [];
        if (name && !AppState.settings.categoryGroups[grp].some(x => x.toLowerCase() === name.toLowerCase())) {
            AppState.settings.categoryGroups[grp].push(name);
        }
        syncFlatCategoriesFromGroups();
    } else {
        const val = document.getElementById('setSingleVal').value.trim();
        if (idxVal !== "") AppState.settings[type][parseInt(idxVal, 10)] = val;
        else AppState.settings[type].push(val);
    }

    closeSettingModal();
    persistLocalSettingsCache();
    populateDropdowns();
    renderSettingsTables();
    saveAllSettingsToCloud(true);
}

function deleteSettingItem(type, idx) {
    AppState.settings[type].splice(idx, 1);
    persistLocalSettingsCache();
    populateDropdowns();
    renderSettingsTables();
    saveAllSettingsToCloud(true);
}

function deleteCategoryItem(grp, cIdx) {
    if (AppState.settings.categoryGroups[grp]) {
        AppState.settings.categoryGroups[grp].splice(cIdx, 1);
    }
    syncFlatCategoriesFromGroups();
    persistLocalSettingsCache();
    populateDropdowns();
    renderSettingsTables();
    saveAllSettingsToCloud(true);
}

// ============================================================================
// REPORT HEADER CONFIG, MY ACCOUNT, DELETE BY DATE & LOGOUT MODALS
// ============================================================================
function openReportConfigModal() {
    const cfg = AppState.settings.reportConfig || {};
    document.getElementById('cfgRepRepublic').value = cfg.republic || "";
    document.getElementById('cfgRepDept').value = cfg.department || "";
    document.getElementById('cfgRepAgency').value = cfg.agency || "";
    document.getElementById('cfgRepOffice').value = cfg.office || "";
    document.getElementById('cfgLogoAlignment').value = cfg.logoAlignment || "left";
    document.getElementById('cfgHeaderTextAlign').value = cfg.headerTextAlign || "center";
    document.getElementById('cfgHeaderSpacing').value = cfg.headerSpacing || "standard";
    document.getElementById('cfgNotedName').value = cfg.notedName || "MARY MAY M. JACOB";
    document.getElementById('cfgNotedDesig').value = cfg.notedDesig || "Head, LTO COMMS/CPAO";
    renderLogoPreviews();
    document.getElementById('reportConfigModal').style.display = 'flex';
}

function closeReportConfigModal() {
    const modal = document.getElementById('reportConfigModal');
    if (modal) modal.style.display = 'none';
}

function renderLogoPreviews() {
    const cfg = AppState.settings.reportConfig || {};
    [1, 2, 3].forEach(n => {
        const el = document.getElementById(`logo${n}Preview`);
        const url = cfg[`logo${n}Url`];
        if (!el) return;
        el.innerHTML = url
            ? `<img src="${url}" class="h-8 w-auto rounded border border-slate-700"><button type="button" onclick="clearReportLogo(${n})" class="text-[10px] text-rose-400 underline">Remove</button>`
            : `<span class="text-[10px] text-slate-500">None</span>`;
    });
}

function handleLogoUpload(e, logoNum) {
    const file = e.target?.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
        if (!AppState.settings.reportConfig) AppState.settings.reportConfig = {};
        AppState.settings.reportConfig[`logo${logoNum}Url`] = reader.result;
        persistLocalSettingsCache();
        renderLogoPreviews();
    };
    reader.readAsDataURL(file);
}

function clearReportLogo(logoNum) {
    if (!AppState.settings.reportConfig) return;
    AppState.settings.reportConfig[`logo${logoNum}Url`] = "";
    persistLocalSettingsCache();
    renderLogoPreviews();
}

function saveReportConfig() {
    if (!AppState.settings.reportConfig) AppState.settings.reportConfig = {};
    AppState.settings.reportConfig.republic = document.getElementById('cfgRepRepublic').value.trim();
    AppState.settings.reportConfig.department = document.getElementById('cfgRepDept').value.trim();
    AppState.settings.reportConfig.agency = document.getElementById('cfgRepAgency').value.trim();
    AppState.settings.reportConfig.office = document.getElementById('cfgRepOffice').value.trim();
    AppState.settings.reportConfig.logoAlignment = document.getElementById('cfgLogoAlignment').value;
    AppState.settings.reportConfig.headerTextAlign = document.getElementById('cfgHeaderTextAlign').value;
    AppState.settings.reportConfig.headerSpacing = document.getElementById('cfgHeaderSpacing').value;
    AppState.settings.reportConfig.notedName = document.getElementById('cfgNotedName').value.trim();
    AppState.settings.reportConfig.notedDesig = document.getElementById('cfgNotedDesig').value.trim();

    persistLocalSettingsCache();
    closeReportConfigModal();
    generateReport();
    generateAccomplishmentReport();
    saveAllSettingsToCloud(true);
    showToast("Report header configuration saved.");
}

function openMyAccountModal() {
    const modal = document.getElementById('myAccountModal');
    if (!modal) return;
    document.getElementById('myAccountUsername').value = currentUser.username || "";
    document.getElementById('myAccountName').value = currentUser.name || "";
    const hasColor = !!(currentUser.logColor && currentUser.logColor !== "Default");
    document.getElementById('myAccountEnableColor').checked = hasColor;
    document.getElementById('myAccountLogColor').value = hasColor ? currentUser.logColor : "#9a4e2a";
    document.getElementById('myAccountLogColor').disabled = !hasColor;
    document.getElementById('myAccountTogglePass').checked = false;
    document.getElementById('passwordChangeSection').style.display = 'none';
    modal.style.display = 'flex';
}

function closeMyAccountModal() {
    const modal = document.getElementById('myAccountModal');
    if (modal) modal.style.display = 'none';
}

function toggleMyColorPicker(enabled) {
    const p = document.getElementById('myAccountLogColor');
    if (p) p.disabled = !enabled;
}

function togglePasswordChangeSection(show) {
    const sec = document.getElementById('passwordChangeSection');
    if (sec) sec.style.display = show ? 'block' : 'none';
}

async function saveMyAccountForm(e) {
    e.preventDefault();
    const newName = document.getElementById('myAccountName').value.trim();
    const enableColor = document.getElementById('myAccountEnableColor').checked;
    const colorVal = enableColor ? document.getElementById('myAccountLogColor').value : "Default";
    const changePass = document.getElementById('myAccountTogglePass').checked;

    currentUser.name = newName || currentUser.name;
    currentUser.logColor = colorVal;

    if (changePass) {
        const oldPass = document.getElementById('myAccountOldPass').value;
        const newPass = document.getElementById('myAccountNewPass').value;
        const confPass = document.getElementById('myAccountConfirmPass').value;
        if (currentUser.pass && oldPass !== currentUser.pass) {
            showSystemAlert("Incorrect Password", "Current password does not match.", "⚠️");
            return;
        }
        if (!newPass || newPass !== confPass) {
            showSystemAlert("Password Mismatch", "New password and confirmation must match.", "⚠️");
            return;
        }
        currentUser.pass = newPass;
    }

    const uIdx = AppState.users.findIndex(u => String(u.username || '').toLowerCase() === String(currentUser.username || '').toLowerCase());
    if (uIdx >= 0) {
        AppState.users[uIdx] = { ...AppState.users[uIdx], ...currentUser };
    }
    sessionStorage.setItem('LTO_ACTIVE_USER', JSON.stringify(currentUser));
    const opEl = document.getElementById('activeOperatorName');
    if (opEl) opEl.textContent = currentUser.name;

    closeMyAccountModal();
    renderUsersTable();
    renderTable();
    await syncUsersToCloud(true);
    showToast("Account updated & synced.");
}

function openDeleteLogsModal() {
    const modal = document.getElementById('deleteLogsModal');
    if (!modal) return;
    document.getElementById('delLogDate').value = getTodayMMDDYYYY();
    document.getElementById('delLogPassword').value = "";
    modal.style.display = 'flex';
}

function closeDeleteLogsModal() {
    const modal = document.getElementById('deleteLogsModal');
    if (modal) modal.style.display = 'none';
}

function confirmDeleteLogsByDate() {
    const targetDate = document.getElementById('delLogDate').value.trim();
    const pass = document.getElementById('delLogPassword').value;
    if (!pass || (currentUser.pass && pass !== currentUser.pass)) {
        showSystemAlert("Authorization Failed", "Invalid authorization password.", "🔒");
        return;
    }
    AppState.tickets = (AppState.tickets || []).filter(t => formatCleanDate(t.dateReceived) !== targetDate);
    saveStorage();
    closeDeleteLogsModal();
    renderTable();
    updateKPIs();
    showToast(`Logs for ${targetDate} removed.`);
}

function openLogoutModal() {
    const modal = document.getElementById('logoutModal');
    if (modal) modal.style.display = 'flex';
}

function closeLogoutModal() {
    const modal = document.getElementById('logoutModal');
    if (modal) modal.style.display = 'none';
}

// ESC keyboard shortcut support
document.addEventListener('keydown', (e) => {
    if (e.key === "Escape") {
        closeGlobalSystemDatePicker();
        closeCalcSystemDatePicker();
        closeSystemModal();
        cancelDuplicateTicketSave();
        closeTicketModal(false);
        closeEndorsePreviewModal();
        closeEndorseModal(false);
        closeDirectoryModal();
        closeOfficialModal();
        closeSettingModal();
        closeReportConfigModal();
        closeUserModal();
        closeMyAccountModal();
        closeDeleteLogsModal();
        closeLogoutModal();
    }
});
