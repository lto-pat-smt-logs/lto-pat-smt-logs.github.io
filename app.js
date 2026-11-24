const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwCu2bb3xAbvw0a4272JDu6PK0jRc0LTa5LenoCHx0kaGLanrlUESg0lIOrw0SiwS8A/exec";
const OFF_DATES_STORAGE_KEY = "LTO_TOGGLED_OFF_DATES_2026";
const SETTINGS_STORAGE_KEY = "LTO_CPAO_SETTINGS_2026";
const CUSTOM_ACCOMPLISHMENTS_KEY = "LTO_CPAO_ACCOMPLISHMENTS_2026";
const LAST_WORKING_ADD_ACTION_KEY = "LTO_WORKING_ADD_ACTION_V1";
const LAST_WORKING_UPDATE_ACTION_KEY = "LTO_WORKING_UPDATE_ACTION_V1";
const PENDING_SYNC_QUEUE_KEY = "LTO_PENDING_SYNC_QUEUE_V1";

const OFFICIAL_ROLE_RANKS = [
    "Regional Director",
    "Assistant Secretary",
    "Executive Director",
    "Division Chief",
    "Chief"
];

const REPORT_SIGNATORIES = [
    { name: "JANZEN HUWEE N. BALTORES", designation: "Public Relations Officer I" },
    { name: "JHOVAN JAPHET C. TALLEDO", designation: "Public Relations Officer I" },
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

const DEFAULT_COLUMN_LABELS = {
    received: "Received",
    adminNo: "ADMIN NO.",
    platform: "PLATFORM",
    referralNo: "REFERRAL / TICKET NO.",
    dateReceived: "DATE RECEIVED",
    category: "CATEGORY",
    ticketType: "TYPE OF TICKET",
    complainantName: "NAME OF COMPLAINANT",
    ticketDetails: "DETAILS OF TICKET",
    responseDetails: "DETAILS OF RESPONSE",
    actionTaken: "ACTION TAKEN",
    status: "STATUS",
    remarks: "REMARKS",
    graphTotalLabel: "TOTAL",
    graphPlatformTitle: "Tickets by Platform",
    graphCategoryTitle: "Tickets by Category"
};

function getColumnLabelsConfig() {
    return {
        ...DEFAULT_COLUMN_LABELS,
        ...(AppState.settings?.columnLabels || {})
    };
}

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

document.addEventListener("focusin", (e) => {
    if (e.target && e.target.classList && e.target.classList.contains("tpl-form-field")) {
        activeTemplateInputField = e.target;
    }
});

let AppState = {
    tickets: [],
    users: [
        { username: "admin36", name: "Admin 36", role: "Super Admin", defaultPortal: "FACEBOOK", pass: "admin123", logColor: "#9a4e2a", canReports: true, canDeleteLogs: true, canManageUsers: true, canAccessSettings: true },
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
        columnLabels: { ...DEFAULT_COLUMN_LABELS },
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
    return `${String(d.getDate()).padStart(2, "0")} ${months[d.getMonth()]} ${d.getFullYear()}`;
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

    // Standard independent date picker — deliberately does NOT check or highlight AppState.toggledOffDates
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
    // Preserve non-empty local logos if cloud returned empty strings
    if (!mergedReportCfg.logo1Url && base.reportConfig?.logo1Url) mergedReportCfg.logo1Url = base.reportConfig.logo1Url;
    if (!mergedReportCfg.logo2Url && base.reportConfig?.logo2Url) mergedReportCfg.logo2Url = base.reportConfig.logo2Url;
    if (!mergedReportCfg.logo3Url && base.reportConfig?.logo3Url) mergedReportCfg.logo3Url = base.reportConfig.logo3Url;

    const enableClipboard = inc.enableResponderClipboard !== undefined
        ? !!inc.enableResponderClipboard
        : (base.enableResponderClipboard !== undefined ? !!base.enableResponderClipboard : true);

    const out = {
        ...base,
        ...inc,
        enableResponderClipboard: enableClipboard,
        categoryGroups: mergedGroups,
        platforms: mergedPlatforms,
        ticketTypes: mergedTicketTypes,
        actionsTaken: mergedActionsTaken,
        statuses: mergedStatuses,
        endorsementForm: {
            ...(base.endorsementForm || STANDARD_ENDORSEMENT_TEMPLATE_FIELDS),
            ...(inc.endorsementForm || {})
        },
        columnLabels: {
            ...DEFAULT_COLUMN_LABELS,
            ...(base.columnLabels || {}),
            ...(inc.columnLabels || {})
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
    try {
        localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(AppState.settings));
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
    } catch (e) {}
    ensureCategoryGroupsInitialized();
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

function isSuperAdmin() { return currentUser && (currentUser.role || "").toLowerCase() === "super admin"; }
function isAdminTL() { return currentUser && ((currentUser.role || "").toLowerCase() === "admintl" || isSuperAdmin()); }
function isAdminSV() { return currentUser && (currentUser.role || "").toLowerCase() === "adminsv"; }
function canUserViewSupervisorStats() { return isSuperAdmin() || isAdminTL() || isAdminSV(); }
function canUserGenerateReports() { return isSuperAdmin() || isAdminTL() || (currentUser && currentUser.canReports === true); }
function canUserDeleteLogs() { return isSuperAdmin() || isAdminTL() || isAdminSV() || (currentUser && currentUser.canDeleteLogs === true); }
function canUserManageUsers() { return isSuperAdmin() || (currentUser && currentUser.canManageUsers === true); }
function canUserAccessSettings() { return isSuperAdmin() || isAdminTL() || (currentUser && currentUser.canAccessSettings === true); }
function canUserEditAnyTicket() { return isSuperAdmin() || isAdminTL(); }
function canUserEditTicket(ticket) {
    if (!ticket) return false;
    if (canUserEditAnyTicket()) return true;
    return isTicketOwnedByCurrentUser(ticket);
}
function canUserDeleteTicket(ticket) {
    if (!ticket) return false;
    if (isSuperAdmin() || isAdminTL()) return true;
    if (isAdminSV() && canUserDeleteLogs()) return true;
    return isTicketOwnedByCurrentUser(ticket);
}
function canUserEditWorkdayOffDates() { return isSuperAdmin() || isAdminTL(); }
function isResponderClipboardEnabled() { return AppState.settings?.enableResponderClipboard !== false; }

function updateUIPrivileges() {
    const btnReports = document.getElementById('tabBtnReports');
    const btnDirectory = document.getElementById('tabBtnDirectory');
    const btnTemplate = document.getElementById('tabBtnTemplate');
    const btnUsers = document.getElementById('tabBtnUsers');
    const btnSupervisor = document.getElementById('tabBtnSupervisor');
    const btnSettings = document.getElementById('tabBtnSettings');
    const btnClipboard = document.getElementById('tabBtnClipboard');
    const btnAccomplishment = document.getElementById('tabBtnAccomplishment');
    const btnBackendSheet = document.getElementById('btnOpenBackendSheet');
    if (btnBackendSheet) btnBackendSheet.style.display = isSuperAdmin() ? 'inline-flex' : 'none';

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
    const hasSupervisorAccess = canUserViewSupervisorStats();
    if (btnSupervisor) btnSupervisor.style.display = hasSupervisorAccess ? 'flex' : 'none';
    if (btnSettings) btnSettings.style.display = (hasSettingsAccess || isAdminTL()) ? 'flex' : 'none';
    const colCfgCard = document.getElementById('columnNamesConfigCard');
    if (colCfgCard) colCfgCard.style.display = (isSuperAdmin() || isAdminTL()) ? 'block' : 'none';
    loadColumnLabelsToUI();
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


const inflightGetRequests = new Map();
let latestCloudLogsCache = { data: null, fetchedAt: 0 };
const CLOUD_LOGS_DEDUPE_MS = 1500;

function fetchCloudLogsJson(forceFresh = false) {
    const now = Date.now();
    if (!forceFresh && latestCloudLogsCache.data && (now - latestCloudLogsCache.fetchedAt) < CLOUD_LOGS_DEDUPE_MS) {
        return Promise.resolve(latestCloudLogsCache.data);
    }
    const key = forceFresh ? "logs_fresh" : "logs_cached";
    if (inflightGetRequests.has(key)) {
        return inflightGetRequests.get(key);
    }
    const reqPromise = fetch(APPS_SCRIPT_URL + "?t=" + now, { mode: 'cors' })
        .then(resp => {
            if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
            return resp.json();
        })
        .then(json => {
            latestCloudLogsCache = { data: json, fetchedAt: Date.now() };
            return json;
        })
        .finally(() => {
            inflightGetRequests.delete(key);
        });
    inflightGetRequests.set(key, reqPromise);
    return reqPromise;
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
        const logsResult = await fetchCloudLogsJson(false);
        if (isSavingTicket || loadPendingSyncQueue().length > 0) return;

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
                renderTable();
                updateKPIs();
                if (canUserViewSupervisorStats()) renderSupervisorStats();
            }
            try {
                const uResp = await fetch(APPS_SCRIPT_URL + "?action=getUsers&t=" + Date.now(), { mode: 'cors' });
                if (uResp.ok) {
                    const uJson = await uResp.json();
                    if (Array.isArray(uJson) && JSON.stringify(uJson) !== JSON.stringify(AppState.users)) {
                        AppState.users = uJson;
                        localStorage.setItem('LTO_CPAO_USERS_2026', JSON.stringify(AppState.users));
                        renderUsersTable();
                        checkScheduledPortalAssignment();
                        if (canUserViewSupervisorStats()) renderSupervisorStats();
                    }
                }
            } catch (_) {}
            updateSyncStatusBadge("synced");
        }
    } catch (e) {
        console.warn("Realtime poll skipped:", e);
    }
}

function applyDefaultViewScopeForUser() {
    const scopeSel = document.getElementById('superadminViewScope');
    if (!scopeSel) return;
    if (!isSuperAdmin()) {
        scopeSel.value = 'my';
    }
}

const IDLE_TIMEOUT_MS = 20 * 60 * 1000; // 20 minutes idle auto-logout
let idleLogoutTimer = null;

function enforceActiveSessionOrRedirect() {
    try {
        const raw = sessionStorage.getItem('LTO_ACTIVE_USER');
        if (!raw) {
            window.location.replace('login.html');
            return false;
        }
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object' || !parsed.username) {
            sessionStorage.removeItem('LTO_ACTIVE_USER');
            window.location.replace('login.html');
            return false;
        }
        currentUser = parsed;
        return true;
    } catch (e) {
        window.location.replace('login.html');
        return false;
    }
}

function resetIdleLogoutTimer() {
    if (idleLogoutTimer) clearTimeout(idleLogoutTimer);
    idleLogoutTimer = setTimeout(() => {
        persistLocalSettingsCache();
        saveOffDatesStorage(false);
        sessionStorage.clear();
        localStorage.removeItem('LTO_ACTIVE_USER');
        window.location.replace('login.html?reason=idle');
    }, IDLE_TIMEOUT_MS);
}

function setupSessionAndIdleGuards() {
    // Clear any leftover localStorage active user so reopening browser/tab always goes to login.html
    try { localStorage.removeItem('LTO_ACTIVE_USER'); } catch (e) {}

    // Reset 20-minute idle timer on any user activity
    ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'click'].forEach(evtName => {
        window.addEventListener(evtName, resetIdleLogoutTimer, { passive: true });
    });
    resetIdleLogoutTimer();

    // Ensure closing/unloading the tab clears session storage immediately
    window.addEventListener('beforeunload', () => {
        persistLocalSettingsCache();
        saveOffDatesStorage(false);
    });
}

async function initSystem() {
    if (!enforceActiveSessionOrRedirect()) return;
    setupSessionAndIdleGuards();
    if (!currentUser.adminNo) {
        currentUser.adminNo = deriveOperatorAdminNo(currentUser);
    }

    loadLocalSettingsCache();
    ensureCategoryGroupsInitialized();
    loadCustomAccomplishmentsStorage();
    loadOffDatesStorage();
    loadDirectoryStorage();
    ensureDirectoryOfficialsInitialized();
    populateOfficialRoleRankDropdown("Chief");
    getEndorsementFormConfig();
    loadUsersStorage();
    checkScheduledPortalAssignment();
    updateUIPrivileges();
    applyDefaultViewScopeForUser();

    const roleBadge = document.getElementById('userRoleBadge');
    if (roleBadge) roleBadge.textContent = (currentUser.role || "ADMIN").toUpperCase();
    const opName = document.getElementById('activeOperatorName');
    if (opName) opName.textContent = currentUser.name || currentUser.username;

    setSystemDateInputValue('filterDate', getTodayISO());

    setSystemDateInputValue('customAccDateInput', getTodayISO());

    loadStorage();
    AppState.tickets = mergeQueuedTicketsIntoList(AppState.tickets);
    populateDropdowns();
    renderTable();
    loadReportConfigToUI();

    const todayIso = getTodayISO();
    setCalcDateValue(todayIso);
    const nowDate = new Date();
    calcCurrentYear = nowDate.getFullYear();
    calcCurrentMonth = nowDate.getMonth();
    renderCalcCalendar();
    renderSavedOffDatesSummary();
    updateSyncStatusBadge(loadPendingSyncQueue().length > 0 ? "queued" : "synced");

    await flushPendingSyncQueue(true);
    await Promise.allSettled([
        fetchSettingsFromCloud(),
        fetchUsersFromCloud(),
        fetchFromGoogleSheets(),
        fetchOffDatesFromCloud()
    ]);
    checkScheduledPortalAssignment();
    applyDefaultViewScopeForUser();

    populateDropdowns();
    renderTable();
    renderDirectoryTable();
    renderTemplateEditorUI();
    renderUsersTable();
    renderSettingsTables();
    updateKPIs();
    renderSnippets();
    renderCalcCalendar();
    renderSavedOffDatesSummary();
    render24HourReminderBanner();
    updateSyncStatusBadge(loadPendingSyncQueue().length > 0 ? "queued" : "synced");

    setInterval(pollRealtimeUpdates, 1500);
    setInterval(render24HourReminderBanner, TIMER_24H_CHECK_INTERVAL_MS);
}

async function fetchAllCloudData() {
    updateSyncStatusBadge("syncing");
    await flushPendingSyncQueue(false);
    await Promise.allSettled([
        saveAllSettingsToCloud(true),
        fetchSettingsFromCloud(),
        fetchUsersFromCloud(),
        fetchFromGoogleSheets(),
        fetchOffDatesFromCloud()
    ]);
    checkScheduledPortalAssignment();
    loadReportConfigToUI();
    populateDropdowns();
    renderTable();
    renderDirectoryTable();
    renderTemplateEditorUI();
    renderUsersTable();
    renderSettingsTables();
    renderCalcCalendar();
    renderSavedOffDatesSummary();
    updateUIPrivileges();
    updateSyncStatusBadge(loadPendingSyncQueue().length > 0 ? "queued" : "synced");
    showToast("All cloud settings, schedules, and logs synchronized successfully.");
}

function checkScheduledPortalAssignment() {
    if (AppState.users && AppState.users.length > 0) {
        const found = AppState.users.find(u => u.username && currentUser.username && u.username.toLowerCase() === currentUser.username.toLowerCase());
        if (found) {
            currentUser = {
                ...currentUser,
                pass: found.pass || currentUser.pass,
                defaultPortal: found.defaultPortal,
                portalStartTime: found.portalStartTime,
                portalEndTime: found.portalEndTime,
                name: found.name || currentUser.name,
                role: found.role || currentUser.role,
                logColor: found.logColor || currentUser.logColor,
                canReports: found.canReports !== undefined ? !!found.canReports : (found.role && found.role.toLowerCase() !== 'admin'),
                canDeleteLogs: found.canDeleteLogs !== undefined ? !!found.canDeleteLogs : (found.role && found.role.toLowerCase() !== 'admin'),
                canManageUsers: found.canManageUsers !== undefined ? !!found.canManageUsers : ((found.role || "").toLowerCase() === 'super admin'),
                canAccessSettings: found.canAccessSettings !== undefined ? !!found.canAccessSettings : ((found.role || "").toLowerCase() === 'super admin')
            };
        }
    }
    currentUser.adminNo = deriveOperatorAdminNo(currentUser);
    const savedLocalColor = localStorage.getItem('LTO_COLOR_' + currentUser.username);
    if (savedLocalColor) currentUser.logColor = savedLocalColor;
    if (!currentUser.logColor) currentUser.logColor = '#9a4e2a';
    sessionStorage.setItem('LTO_ACTIVE_USER', JSON.stringify(currentUser));
    updateUIPrivileges();
}

function openReportConfigModal() { if (!canUserGenerateReports()) return; loadReportConfigToUI(); document.getElementById('reportConfigModal').style.display = 'flex'; }
function closeReportConfigModal() { document.getElementById('reportConfigModal').style.display = 'none'; }
function openLogoutModal() { document.getElementById('logoutModal').style.display = 'flex'; }
function closeLogoutModal() { document.getElementById('logoutModal').style.display = 'none'; }

function toggleMyColorPicker(enable) {
    const cp = document.getElementById('myAccountLogColor');
    if (cp) { cp.disabled = !enable; cp.style.opacity = enable ? '1' : '0.5'; }
}

function togglePasswordChangeSection(enable) {
    const sec = document.getElementById('passwordChangeSection');
    if (sec) sec.style.display = enable ? 'block' : 'none';
}

function openMyAccountModal() {
    document.getElementById('myAccountUsername').value = currentUser.username || '';
    document.getElementById('myAccountName').value = currentUser.name || currentUser.username || '';
    const passToggle = document.getElementById('myAccountTogglePass');
    if(passToggle) passToggle.checked = false;
    togglePasswordChangeSection(false);
    const useCustom = !!(currentUser.logColor && currentUser.logColor !== 'Default');
    document.getElementById('myAccountEnableColor').checked = useCustom;
    toggleMyColorPicker(useCustom);
    document.getElementById('myAccountLogColor').value = useCustom ? currentUser.logColor : '#9a4e2a';
    document.getElementById('myAccountModal').style.display = 'flex';
}
function closeMyAccountModal() { document.getElementById('myAccountModal').style.display = 'none'; }

async function saveMyAccountForm(e) {
    e.preventDefault();
    currentUser.name = document.getElementById('myAccountName').value.trim();
    const useCustom = document.getElementById('myAccountEnableColor').checked;
    currentUser.logColor = useCustom ? document.getElementById('myAccountLogColor').value : 'Default';
    localStorage.setItem('LTO_COLOR_' + currentUser.username, currentUser.logColor);

    if (document.getElementById('myAccountTogglePass').checked) {
        const oldPass = document.getElementById('myAccountOldPass').value.trim();
        const newPass = document.getElementById('myAccountNewPass').value.trim();
        const confirmPass = document.getElementById('myAccountConfirmPass').value.trim();
        if (oldPass !== currentUser.pass) { showSystemAlert("Password Error", "Your existing password is incorrect.", "❌"); return; }
        if (!newPass || newPass !== confirmPass) { showSystemAlert("Password Error", "New Password and Confirm Password do not match.", "❌"); return; }
        currentUser.pass = newPass;
    }
    currentUser.adminNo = deriveOperatorAdminNo(currentUser);

    const userIdx = AppState.users.findIndex(u => u.username.toLowerCase() === currentUser.username.toLowerCase());
    if (userIdx !== -1) AppState.users[userIdx] = { ...AppState.users[userIdx], ...currentUser };
    else AppState.users.push(currentUser);

    sessionStorage.setItem('LTO_ACTIVE_USER', JSON.stringify(currentUser));
    await saveUsersStorage();
    document.getElementById('activeOperatorName').textContent = currentUser.name || currentUser.username;
    renderTable();
    closeMyAccountModal();
    showToast("Account settings updated successfully.");
}

async function fetchSettingsFromCloud() {
    loadLocalSettingsCache();
    try {
        let response = await fetch(APPS_SCRIPT_URL + "?action=getSettings&t=" + Date.now(), { mode: 'cors' });
        if (!response.ok) return;
        let result = await response.json();
        const cloudSettings = (result && typeof result === "object" && result.settings && typeof result.settings === "object")
            ? result.settings
            : result;
        if (cloudSettings && typeof cloudSettings === "object" && (cloudSettings.categories || cloudSettings.categoryGroups || cloudSettings.platforms || cloudSettings.endorsementForm || cloudSettings.reportConfig)) {
            AppState.settings = mergeSettingsSafely(AppState.settings, cloudSettings, true);
            persistLocalSettingsCache();
        }
    } catch(e) {}
    ensureCategoryGroupsInitialized();
    getEndorsementFormConfig();
    persistLocalSettingsCache();
    loadReportConfigToUI();
    renderTemplateEditorUI();
    updateUIPrivileges();
}

async function saveAllSettingsToCloud(silent = false) {
    ensureCategoryGroupsInitialized();
    getEndorsementFormConfig();
    persistLocalSettingsCache();
    populateDropdowns();
    renderSettingsTables();
    try {
        await fetchWithRetry(APPS_SCRIPT_URL, {
            method: "POST",
            headers: { "Content-Type": "text/plain;charset=utf-8" },
            body: JSON.stringify({ action: "saveSettings", settings: AppState.settings })
        }, 2);
        if (!silent) showToast("Settings saved locally and synced to cloud.");
    } catch(e) {
        if (!silent) showToast("Settings saved locally.");
    }
}

async function fetchFromGoogleSheets() {
    try {
        let result = await fetchCloudLogsJson(true);
        if (Array.isArray(result)) {
            const validRows = result.filter(item => !String(item.rowIndex || item['#'] || '').toUpperCase().startsWith('DATE:'));
            AppState.tickets = mergeQueuedTicketsIntoList(
                validRows.map((item, idx) => normalizeTicketObject(item, idx))
            );
            saveStorage();
            renderTable();
            updateKPIs();
            updateSyncStatusBadge(loadPendingSyncQueue().length > 0 ? "queued" : "synced");
        }
    } catch(e) {
        loadStorage();
        AppState.tickets = mergeQueuedTicketsIntoList(AppState.tickets);
        renderTable();
        updateKPIs();
        updateSyncStatusBadge(loadPendingSyncQueue().length > 0 ? "queued" : "error");
    }
}

async function fetchUsersFromCloud() {
    try {
        let response = await fetch(APPS_SCRIPT_URL + "?action=getUsers&t=" + Date.now(), { mode: 'cors' });
        if (!response.ok) return;
        let result = await response.json();
        if (Array.isArray(result) && result.length > 0) {
            AppState.users = result;
            saveUsersStorage();
            renderUsersTable();
        }
    } catch(e) {}
}

function normalizeTicketObject(raw, idx) {
    let extraObj = {};
    try { extraObj = typeof raw.extraData === 'string' ? JSON.parse(raw.extraData || "{}") : (raw.extraData || {}); } catch(e){}
    let cleanDate = formatCleanDate(raw.dateReceived || raw['DATE RECEIVED'] || '');
    const refNo = String(raw.referralNo || raw['REFERRAL / TICKET NUMBER'] || raw['REFERRAL / TICKET NO.'] || '').trim();
    const normStatus = String(raw.status || raw['STATUS'] || 'Closed').trim();
    const isClosed = normStatus.toLowerCase() === 'closed';
    const active24h = !isClosed && !!(raw.is24Hours || extraObj.is24Hours);

    return {
        rowIndex: raw.rowIndex || raw['#'] || (idx + 2),
        adminNo: String(raw.adminNo || raw['ADMIN NO.'] || '').trim(),
        platform: String(raw.platform || raw['PLATFORM'] || 'FACEBOOK').trim(),
        referralNo: refNo,
        dateReceived: cleanDate,
        category: String(raw.category || raw['CATEGORY'] || '').trim(),
        ticketType: String(raw.ticketType || raw['TYPE OF TICKET'] || '').trim(),
        complainantName: String(raw.complainantName || raw['NAME OF COMPLAINANT'] || '').trim(),
        ticketDetails: String(raw.ticketDetails || raw['DETAILS OF TICKET'] || '').trim(),
        responseDetails: String(raw.responseDetails || raw['DETAILS OF RESPONSE'] || '').trim(),
        actionTaken: String(raw.actionTaken || raw['ACTION TAKEN'] || '').trim(),
        status: normStatus,
        remarks: String(raw.remarks || raw['REMARKS'] || '').trim(),
        is24Hours: active24h,
        extraData: {
            ...extraObj,
            is24Hours: active24h,
            timer24hStartedAt: extraObj.timer24hStartedAt || null,
            timer24hDueAt: extraObj.timer24hDueAt || null,
            timer24hRemindedAt: extraObj.timer24hRemindedAt || null
        }
    };
}

function loadStorage() {
    const saved = localStorage.getItem('LTO_CPAO_TICKETS_2026');
    if (saved) AppState.tickets = JSON.parse(saved);
}

function saveStorage() {
    localStorage.setItem('LTO_CPAO_TICKETS_2026', JSON.stringify(AppState.tickets));
    updateKPIs();
}

function loadDirectoryStorage() {
    const saved = localStorage.getItem('LTO_CPAO_DIRECTORY_2026');
    if (saved) {
        try { const parsed = JSON.parse(saved); if (Array.isArray(parsed) && parsed.length > 0) AppState.directory = parsed; } catch(e){}
    }
    ensureDirectoryOfficialsInitialized();
    if (selectedDirectoryIndex >= AppState.directory.length) {
        selectedDirectoryIndex = 0;
    }
}

function saveDirectoryStorage() {
    ensureDirectoryOfficialsInitialized();
    localStorage.setItem('LTO_CPAO_DIRECTORY_2026', JSON.stringify(AppState.directory));
}

function loadUsersStorage() {
    const saved = localStorage.getItem('LTO_CPAO_USERS_2026');
    if (saved) {
        try { const parsed = JSON.parse(saved); if (Array.isArray(parsed) && parsed.length > 0) AppState.users = parsed; } catch(e){}
    }
}

async function saveUsersStorage() {
    localStorage.setItem('LTO_CPAO_USERS_2026', JSON.stringify(AppState.users));
    try {
        await fetchWithRetry(APPS_SCRIPT_URL, {
            method: "POST",
            headers: { "Content-Type": "text/plain;charset=utf-8" },
            body: JSON.stringify({ action: "saveUsers", users: AppState.users })
        }, 2);
    } catch(e) {}
}

function populateDropdowns() {
    ensureCategoryGroupsInitialized();
    populateOfficialRoleRankDropdown(document.getElementById("offRoleRank")?.value || "Chief");
    const platFilters = document.getElementById('filterPlatform');
    const formPlat = document.getElementById('formPlatform');
    const userPortal = document.getElementById('formUserDefaultPortal');

    let curPlat = platFilters ? platFilters.value : "";
    let curFormPlat = formPlat ? formPlat.value : "";
    let curUserPortal = userPortal ? userPortal.value : "";

    if(platFilters) platFilters.innerHTML = '<option value="">All Platforms</option>';
    if(formPlat) formPlat.innerHTML = '';
    if(userPortal) userPortal.innerHTML = '<option value="">None / Any</option>';

    AppState.settings.platforms.forEach(p => {
        const name = typeof p === 'string' ? p : p.name;
        if(platFilters) platFilters.innerHTML += `<option value="${name}">${name}</option>`;
        if(formPlat) formPlat.innerHTML += `<option value="${name}">${name}</option>`;
        if(userPortal) userPortal.innerHTML += `<option value="${name}">${name}</option>`;
    });

    if(platFilters) platFilters.value = curPlat;
    if(formPlat && curFormPlat) formPlat.value = curFormPlat;
    if(userPortal && curUserPortal) userPortal.value = curUserPortal;

    const typeSel = document.getElementById('formTicketType');
    if(typeSel) {
        let cur = typeSel.value;
        typeSel.innerHTML = '';
        (AppState.settings.ticketTypes || []).forEach(t => { typeSel.innerHTML += `<option value="${t}">${t}</option>`; });
        if(cur) typeSel.value = cur;
    }

    const actSel = document.getElementById('formActionTaken');
    if(actSel) {
        let cur = actSel.value;
        actSel.innerHTML = '';
        (AppState.settings.actionsTaken || []).forEach(a => { actSel.innerHTML += `<option value="${a}">${a}</option>`; });
        if(cur) actSel.value = cur;
    }

    const statSel = document.getElementById('formStatus');
    const filterStat = document.getElementById('filterStatus');
    if(statSel) {
        let cur = statSel.value;
        statSel.innerHTML = '';
        (AppState.settings.statuses || []).forEach(s => { statSel.innerHTML += `<option value="${s}">${s}</option>`; });
        if(cur) {
            statSel.value = cur;
        } else if (Array.from(statSel.options).some(o => o.value.toLowerCase() === 'closed')) {
            statSel.value = Array.from(statSel.options).find(o => o.value.toLowerCase() === 'closed').value;
        }
    }
    if(filterStat) {
        let cur = filterStat.value;
        filterStat.innerHTML = '<option value="">All Statuses</option>';
        (AppState.settings.statuses || []).forEach(s => { filterStat.innerHTML += `<option value="${s}">${s}</option>`; });
        if(cur) filterStat.value = cur;
    }

    renderSettingsTables();
    renderModalCustomFields();
    renderTableHeadersAndColumns();
}

function filterCategoryDropdown(query) {
    ensureCategoryGroupsInitialized();
    const listEl = document.getElementById('categoryDropdownList');
    if (!listEl) return;
    const q = (query || "").toLowerCase().trim();

    let html = "";
    CATEGORY_GROUPS.forEach(grp => {
        const items = (AppState.settings.categoryGroups[grp] || []).filter(c =>
            !q || c.toLowerCase().includes(q) || grp.toLowerCase().includes(q)
        );
        if (items.length > 0) {
            html += `<div class="px-2 py-1 text-[10px] font-extrabold uppercase bg-slate-950 text-amber-400 border-b border-slate-800 sticky top-0">${escapeHtml(grp)}</div>`;
            html += items.map(c => `
                <div data-cat-value="${escapeHtml(c)}" class="cat-dropdown-item px-3 py-1.5 text-xs text-white hover:bg-slate-800 cursor-pointer font-semibold border-b border-slate-800/40">
                    ${escapeHtml(c)}
                </div>
            `).join('');
        }
    });

    if (!html) {
        listEl.innerHTML = `<div class="p-2 text-xs text-slate-400 italic">No matching category configured in Superadmin Settings.</div>`;
    } else {
        listEl.innerHTML = html;
    }
    listEl.classList.remove('hidden');
}

function showCategoryDropdown() {
    filterCategoryDropdown(document.getElementById('formCategorySearch')?.value || '');
}

function selectCategoryOption(val) {
    const searchEl = document.getElementById('formCategorySearch');
    if (searchEl) searchEl.value = val;
    const listEl = document.getElementById('categoryDropdownList');
    if (listEl) listEl.classList.add('hidden');
}

document.addEventListener('click', (e) => {
    const catOptionEl = e.target.closest && e.target.closest('.cat-dropdown-item');
    if (catOptionEl) {
        selectCategoryOption(catOptionEl.getAttribute('data-cat-value') || '');
        return;
    }
    const catInput = document.getElementById('formCategorySearch');
    const catList = document.getElementById('categoryDropdownList');
    if (catInput && catList && !catInput.contains(e.target) && !catList.contains(e.target)) {
        catList.classList.add('hidden');
    }
});

function renderSettingsTables() {
    ensureCategoryGroupsInitialized();
    const qPlat = (document.getElementById('searchSettingsPlatforms')?.value || '').toLowerCase().trim();
    const qCat = (document.getElementById('searchSettingsCategories')?.value || '').toLowerCase().trim();
    const qType = (document.getElementById('searchSettingsTicketTypes')?.value || '').toLowerCase().trim();
    const qAct = (document.getElementById('searchSettingsActionsTaken')?.value || '').toLowerCase().trim();

    const platBody = document.getElementById('tablePlatformsBody');
    if (platBody) {
        platBody.innerHTML = '';
        let platMatches = 0;
        AppState.settings.platforms.forEach((p, idx) => {
            const name = typeof p === 'string' ? p : p.name;
            const autoGen = typeof p === 'string' ? false : !!p.autoGen;
            const prefix = typeof p === 'string' ? 'CPAO' : (p.prefix || 'CPAO');
            if (qPlat && !String(name).toLowerCase().includes(qPlat) && !String(prefix).toLowerCase().includes(qPlat)) return;
            platMatches++;
            platBody.innerHTML += `
                <tr>
                    <td class="font-bold text-white">${escapeHtml(name)}</td>
                    <td class="font-mono text-amber-400">${escapeHtml(prefix)}</td>
                    <td class="text-center"><span class="px-2 py-0.5 rounded text-[10px] font-bold ${autoGen ? 'bg-emerald-950 text-emerald-300' : 'bg-slate-800 text-slate-400'}">${autoGen ? 'YES' : 'NO'}</span></td>
                    <td class="text-center space-x-1">
                        <button type="button" onclick="openSettingModal('platforms', ${idx})" class="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-[10px] font-bold">✏️ Edit</button>
                        <button type="button" onclick="deleteSettingItem('platforms', ${idx})" class="px-2 py-1 bg-rose-950 hover:bg-rose-900 text-rose-300 rounded text-[10px] font-bold">🗑️</button>
                    </td>
                </tr>
            `;
        });
        if (platMatches === 0) {
            platBody.innerHTML = `<tr><td colspan="4" class="text-center text-slate-500 italic py-4">No matching platforms found.</td></tr>`;
        }
    }

    const catBody = document.getElementById('tableCategoriesBody');
    if (catBody) {
        catBody.innerHTML = '';
        let catGroupMatches = 0;
        CATEGORY_GROUPS.forEach((grp, gIdx) => {
            const allItems = AppState.settings.categoryGroups[grp] || [];
            const groupMatchesQuery = qCat && grp.toLowerCase().includes(qCat);
            const filteredEntries = allItems
                .map((item, idx) => ({ item, idx }))
                .filter(({ item }) => !qCat || groupMatchesQuery || String(item).toLowerCase().includes(qCat));

            if (qCat && filteredEntries.length === 0 && !groupMatchesQuery) return;
            catGroupMatches++;

            catBody.innerHTML += `
                <tr class="bg-slate-950/90">
                    <td colspan="2" class="font-extrabold text-[10px] uppercase text-sky-400 tracking-wider py-2 px-2.5">${escapeHtml(grp)}</td>
                </tr>
            `;
            if (filteredEntries.length === 0) {
                catBody.innerHTML += `
                    <tr>
                        <td class="text-slate-500 italic text-[11px] pl-4">No categories under this group yet.</td>
                        <td class="text-center">
                            <button type="button" data-action="add-cat" data-group-idx="${gIdx}" class="cat-setting-btn px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-sky-300 rounded text-[10px] font-bold cursor-pointer">+ Add</button>
                        </td>
                    </tr>
                `;
            } else {
                filteredEntries.forEach(({ item, idx }) => {
                    catBody.innerHTML += `
                        <tr>
                            <td class="font-semibold text-white pl-4">${escapeHtml(item)}</td>
                            <td class="text-center space-x-1 whitespace-nowrap">
                                <button type="button" data-action="edit-cat" data-group-idx="${gIdx}" data-item-idx="${idx}" class="cat-setting-btn px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-[10px] font-bold cursor-pointer">✏️ Edit</button>
                                <button type="button" data-action="del-cat" data-group-idx="${gIdx}" data-item-idx="${idx}" class="cat-setting-btn px-2 py-1 bg-rose-950 hover:bg-rose-900 text-rose-300 rounded text-[10px] font-bold cursor-pointer">🗑️</button>
                            </td>
                        </tr>
                    `;
                });
            }
        });
        if (catGroupMatches === 0) {
            catBody.innerHTML = `<tr><td colspan="2" class="text-center text-slate-500 italic py-4">No matching concern categories found.</td></tr>`;
        }
    }

    const actBody = document.getElementById('tableActionsTakenBody');
    if (actBody) {
        actBody.innerHTML = '';
        let actMatches = 0;
        (AppState.settings.actionsTaken || []).forEach((item, idx) => {
            if (qAct && !String(item).toLowerCase().includes(qAct)) return;
            actMatches++;
            actBody.innerHTML += `
                <tr>
                    <td class="font-bold text-white">${escapeHtml(item)}</td>
                    <td class="text-center space-x-1 whitespace-nowrap">
                        <button type="button" onclick="openSettingModal('actionsTaken', ${idx})" class="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-[10px] font-bold">✏️ Edit</button>
                        <button type="button" onclick="deleteSettingItem('actionsTaken', ${idx})" class="px-2 py-1 bg-rose-950 hover:bg-rose-900 text-rose-300 rounded text-[10px] font-bold">🗑️</button>
                    </td>
                </tr>
            `;
        });
        if (actMatches === 0) {
            actBody.innerHTML = `<tr><td colspan="2" class="text-center text-slate-500 italic py-4">No matching actions taken found.</td></tr>`;
        }
    }

    const ttBody = document.getElementById('tableTicketTypesBody');
    if (ttBody) {
        ttBody.innerHTML = '';
        let typeMatches = 0;
        AppState.settings.ticketTypes.forEach((item, idx) => {
            if (qType && !String(item).toLowerCase().includes(qType)) return;
            typeMatches++;
            ttBody.innerHTML += `
                <tr>
                    <td class="font-bold text-white">${escapeHtml(item)}</td>
                    <td class="text-center space-x-1">
                        <button type="button" onclick="openSettingModal('ticketTypes', ${idx})" class="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-[10px] font-bold">✏️ Edit</button>
                        <button type="button" onclick="deleteSettingItem('ticketTypes', ${idx})" class="px-2 py-1 bg-rose-950 hover:bg-rose-900 text-rose-300 rounded text-[10px] font-bold">🗑️</button>
                    </td>
                </tr>
            `;
        });
        if (typeMatches === 0) {
            ttBody.innerHTML = `<tr><td colspan="2" class="text-center text-slate-500 italic py-4">No matching classifications found.</td></tr>`;
        }
    }
}

document.addEventListener('click', (e) => {
    const btn = e.target.closest && e.target.closest('.cat-setting-btn');
    if (!btn) return;
    const action = btn.getAttribute('data-action');
    const gIdx = parseInt(btn.getAttribute('data-group-idx'), 10);
    const grp = CATEGORY_GROUPS[gIdx];
    if (!grp) return;

    if (action === 'add-cat') {
        openSettingModal('categories', null, grp);
    } else if (action === 'edit-cat') {
        const itemIdx = parseInt(btn.getAttribute('data-item-idx'), 10);
        openSettingModal('categories', itemIdx, grp);
    } else if (action === 'del-cat') {
        const itemIdx = parseInt(btn.getAttribute('data-item-idx'), 10);
        deleteSettingItem('categories', itemIdx, grp);
    }
});

function openSettingModal(type, index, groupName = null) {
    ensureCategoryGroupsInitialized();
    const modal = document.getElementById('settingItemModal');
    if (!modal) return;
    document.getElementById('settingModalType').value = type;
    document.getElementById('settingModalIndex').value = index !== null && index !== undefined ? index : '';

    const container = document.getElementById('settingModalFieldsContainer');
    document.getElementById('settingModalTitle').textContent = index !== null ? `Edit ${type}` : `Add New ${type}`;

    if (type === 'platforms') {
        let pName = "", pPrefix = "", pAuto = true;
        if (index !== null && index !== undefined) {
            let p = AppState.settings.platforms[index];
            pName = typeof p === 'string' ? p : p.name;
            pPrefix = typeof p === 'string' ? 'CPAO' : (p.prefix || 'CPAO');
            pAuto = typeof p === 'string' ? false : !!p.autoGen;
        }
        container.innerHTML = `
            <div><label class="block text-slate-400 text-[10px] font-bold uppercase mb-1">Platform Name</label><input type="text" id="modalPlatformName" value="${escapeHtml(pName)}" required class="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white"></div>
            <div><label class="block text-slate-400 text-[10px] font-bold uppercase mb-1">Ticket Prefix</label><input type="text" id="modalPlatformPrefix" value="${escapeHtml(pPrefix)}" required class="w-full bg-slate-950 border border-slate-800 rounded p-2 text-amber-400 font-mono"></div>
            <div><label class="flex items-center gap-2 text-xs font-bold text-sky-400"><input type="checkbox" id="modalPlatformAutoGen" ${pAuto ? 'checked' : ''}> Auto-Generate Ticket Number</label></div>
        `;
    } else if (type === 'categories') {
        const selectedGroup = groupName || CATEGORY_GROUPS[0];
        let val = "";
        if (index !== null && index !== undefined && AppState.settings.categoryGroups[selectedGroup]) {
            val = AppState.settings.categoryGroups[selectedGroup][index] || "";
        }
        const groupOptionsHtml = CATEGORY_GROUPS.map(g =>
            `<option value="${escapeHtml(g)}" ${g === selectedGroup ? 'selected' : ''}>${escapeHtml(g)}</option>`
        ).join('');

        container.innerHTML = `
            <input type="hidden" id="modalOriginalCategoryGroup" value="${escapeHtml(selectedGroup)}">
            <input type="hidden" id="modalOriginalCategoryName" value="${escapeHtml(val)}">
            <div>
                <label class="block text-slate-400 text-[10px] font-bold uppercase mb-1">Concern Category Group</label>
                <select id="modalCategoryGroup" class="w-full bg-slate-950 border border-slate-800 rounded p-2 text-amber-400 font-bold">
                    ${groupOptionsHtml}
                </select>
            </div>
            <div>
                <label class="block text-slate-400 text-[10px] font-bold uppercase mb-1">Concern Category Name</label>
                <input type="text" id="modalSettingValue" value="${escapeHtml(val)}" required placeholder="Enter concern category..." class="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white">
            </div>
        `;
    } else {
        let val = "";
        if (index !== null && index !== undefined) val = AppState.settings[type][index] || "";
        container.innerHTML = `
            <div><label class="block text-slate-400 text-[10px] font-bold uppercase mb-1">Item Value / Name</label><input type="text" id="modalSettingValue" value="${escapeHtml(val)}" required class="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white"></div>
        `;
    }
    modal.style.display = 'flex';
}

function closeSettingModal() { document.getElementById('settingItemModal').style.display = 'none'; }

async function propagateCategoryRenameAcrossSystem(oldCategoryName, newCategoryName) {
    const oldClean = String(oldCategoryName || '').trim();
    const newClean = String(newCategoryName || '').trim();
    if (!oldClean || !newClean || oldClean === newClean) return 0;

    let updatedCount = 0;
    const oldLower = oldClean.toLowerCase();
    const modifiedTickets = [];

    AppState.tickets.forEach((t, idx) => {
        if (String(t.category || '').trim().toLowerCase() === oldLower) {
            t.category = newClean;
            updatedCount++;
            modifiedTickets.push({ ticket: t, idx });
        }
    });

    if (updatedCount > 0) {
        saveStorage();
        renderTable();
        updateKPIs();
        for (const item of modifiedTickets) {
            const targetRow = item.ticket.rowIndex || (item.idx + 2);
            enqueuePendingTicketSync(item.ticket, true, targetRow);
        }
        flushPendingSyncQueue(true);
    }

    const repCatSel = document.getElementById('repFilterCategory');
    if (repCatSel) {
        populateReportFilterDropdowns();
        if (document.getElementById('viewReports')?.style.display !== 'none') {
            generateReport();
        }
    }

    return updatedCount;
}

async function saveSettingItemForm(e) {
    e.preventDefault();
    ensureCategoryGroupsInitialized();
    const type = document.getElementById('settingModalType').value;
    const indexStr = document.getElementById('settingModalIndex').value;
    const index = indexStr !== '' ? parseInt(indexStr, 10) : null;

    if (type === 'platforms') {
        const name = document.getElementById('modalPlatformName').value.trim();
        const prefix = document.getElementById('modalPlatformPrefix').value.trim();
        const autoGen = document.getElementById('modalPlatformAutoGen').checked;
        const obj = { name, prefix, autoGen };
        if (index !== null) AppState.settings.platforms[index] = obj;
        else AppState.settings.platforms.push(obj);
    } else if (type === 'categories') {
        const chosenGroup = document.getElementById('modalCategoryGroup').value;
        const originalGroup = document.getElementById('modalOriginalCategoryGroup')?.value || chosenGroup;
        const originalName = document.getElementById('modalOriginalCategoryName')?.value || "";
        const val = document.getElementById('modalSettingValue').value.trim();
        if (!val) return;
        if (!AppState.settings.categoryGroups[chosenGroup]) AppState.settings.categoryGroups[chosenGroup] = [];

        if (index !== null && AppState.settings.categoryGroups[originalGroup]?.[index] !== undefined) {
            if (originalGroup === chosenGroup) {
                AppState.settings.categoryGroups[chosenGroup][index] = val;
            } else {
                AppState.settings.categoryGroups[originalGroup].splice(index, 1);
                const existsInNew = AppState.settings.categoryGroups[chosenGroup].some(c => c.toLowerCase() === val.toLowerCase());
                if (!existsInNew) AppState.settings.categoryGroups[chosenGroup].push(val);
            }
            syncFlatCategoriesFromGroups();
            if (originalName && originalName !== val) {
                const updatedLogsCount = await propagateCategoryRenameAcrossSystem(originalName, val);
                if (updatedLogsCount > 0) {
                    showToast(`Category renamed & updated across ${updatedLogsCount} existing log(s).`);
                }
            }
        } else {
            const exists = AppState.settings.categoryGroups[chosenGroup].some(c => c.toLowerCase() === val.toLowerCase());
            if (!exists) AppState.settings.categoryGroups[chosenGroup].push(val);
            syncFlatCategoriesFromGroups();
        }
    } else {
        const val = document.getElementById('modalSettingValue').value.trim();
        if (index !== null) AppState.settings[type][index] = val;
        else AppState.settings[type].push(val);
    }

    persistLocalSettingsCache();
    renderSettingsTables();
    populateDropdowns();
    populateReportFilterDropdowns();
    if (document.getElementById('viewReports')?.style.display !== 'none') {
        generateReport();
    }
    closeSettingModal();
    showToast("Setting saved locally. Syncing to cloud...");
    saveAllSettingsToCloud(true);
}

function deleteSettingItem(type, index, groupName = null) {
    ensureCategoryGroupsInitialized();
    showSystemConfirm("Delete Item", "Are you sure you want to delete this item?", () => {
        if (type === 'categories' && groupName && AppState.settings.categoryGroups[groupName]) {
            AppState.settings.categoryGroups[groupName].splice(index, 1);
            syncFlatCategoriesFromGroups();
        } else {
            AppState.settings[type].splice(index, 1);
        }
        persistLocalSettingsCache();
        renderSettingsTables();
        populateDropdowns();
        populateReportFilterDropdowns();
        if (document.getElementById('viewReports')?.style.display !== 'none') {
            generateReport();
        }
        showToast("Item deleted successfully.");
        saveAllSettingsToCloud(true);
    });
}

function renderModalCustomFields() {
    const container = document.getElementById('modalCustomFieldsContainer');
    if(!container) return;
    container.innerHTML = '';
    if(!AppState.settings.customFields || AppState.settings.customFields.length === 0) return;
    AppState.settings.customFields.forEach(cf => {
        container.innerHTML += `<div><label class="block text-slate-400 font-bold mb-1 uppercase text-[10px]">${escapeHtml(cf.label)}</label><input type="text" id="customField_${cf.id}" class="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white"></div>`;
    });
}

function renderTableHeadersAndColumns() {
    const headerRow = document.getElementById('tableHeaderRow');
    if(!headerRow) return;
    const cols = getColumnLabelsConfig();
    headerRow.innerHTML = `
        <th class="text-center">#</th><th class="text-center">ACTIONS</th><th>${escapeHtml(cols.adminNo)}</th><th>${escapeHtml(cols.platform)}</th>
        <th>${escapeHtml(cols.referralNo)}</th><th>${escapeHtml(cols.dateReceived)}</th><th>${escapeHtml(cols.category)}</th><th>${escapeHtml(cols.ticketType)}</th>
        <th>${escapeHtml(cols.complainantName)}</th><th>${escapeHtml(cols.ticketDetails)}</th><th>${escapeHtml(cols.responseDetails)}</th><th>${escapeHtml(cols.actionTaken)}</th>
        <th class="text-center">${escapeHtml(cols.status)}</th><th>${escapeHtml(cols.remarks)}</th>
    `;
}

function selectDirectoryRegionForDetails(idx) {
    if (idx < 0 || idx >= AppState.directory.length) {
        selectedDirectoryIndex = 0;
    } else {
        selectedDirectoryIndex = idx;
    }
    renderDirectoryTable();
}

function renderDirectoryTable() {
    ensureDirectoryOfficialsInitialized();
    const tbody = document.getElementById('directoryTableBody');
    const detailBody = document.getElementById('directoryDetailTableBody');
    const detailTitle = document.getElementById('selectedRegionDetailsTitle');
    if (!tbody) return;

    tbody.innerHTML = '';

    if (!AppState.directory || AppState.directory.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" class="text-center py-8 text-slate-400 text-xs">No LTO directory entries found. Click <strong>+ Add Region / Office</strong> above.</td></tr>`;
        if (detailBody) {
            detailBody.innerHTML = `<tr><td colspan="8" class="text-center py-6 text-slate-500 text-xs">No region record selected.</td></tr>`;
        }
        return;
    }

    if (selectedDirectoryIndex < 0 || selectedDirectoryIndex >= AppState.directory.length) {
        selectedDirectoryIndex = 0;
    }

    AppState.directory.forEach((d, idx) => {
        const isSelected = idx === selectedDirectoryIndex;
        const offCount = (d.officials || []).length;
        const tr = document.createElement('tr');
        tr.className = isSelected ? 'bg-sky-950/35 transition' : 'hover:bg-slate-800/40 transition';
        tr.innerHTML = `
            <td class="font-bold text-white cursor-pointer" onclick="selectDirectoryRegionForDetails(${idx})">
                <div class="flex items-center gap-2">
                    <span>${escapeHtml(d.office)}</span>
                    ${isSelected ? '<span class="px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/40 text-[9px] font-extrabold uppercase">Viewing</span>' : ''}
                </div>
            </td>
            <td class="font-mono font-bold text-amber-400 cursor-pointer" onclick="selectDirectoryRegionForDetails(${idx})">${escapeHtml(d.code || 'RO')}</td>
            <td class="text-slate-200 cursor-pointer" onclick="selectDirectoryRegionForDetails(${idx})">
                <span>${escapeHtml(d.chief)}</span>
                <span class="ml-2 px-1.5 py-0.5 rounded bg-slate-800 text-sky-300 text-[9px] font-bold">${offCount} Official${offCount === 1 ? '' : 's'}</span>
            </td>
            <td class="text-center space-x-1 whitespace-nowrap">
                <button type="button" onclick="editDirectoryRegionRow(${idx})" class="px-2.5 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded text-[10px] font-bold shadow transition">✏️ Edit</button>
                <button type="button" onclick="deleteDirectoryItem(${idx})" class="px-2.5 py-1 bg-rose-950 hover:bg-rose-900 text-rose-300 border border-rose-800/60 rounded text-[10px] font-bold transition">🗑️ Delete</button>
            </td>
        `;
        tbody.appendChild(tr);
    });

    if (detailBody) {
        const activeRegion = AppState.directory[selectedDirectoryIndex];
        if (detailTitle && activeRegion) {
            detailTitle.textContent = `Selected Region Directory Details — ${activeRegion.office} (${activeRegion.code})`;
        }
        detailBody.innerHTML = activeRegion ? `
            <tr class="bg-slate-950/50">
                <td class="font-mono font-bold text-amber-400 whitespace-nowrap">${escapeHtml(activeRegion.code || 'RO')}</td>
                <td class="font-bold text-white">${escapeHtml(activeRegion.office)}</td>
                <td class="text-slate-100">${escapeHtml(activeRegion.chief)}</td>
                <td><span class="text-sky-400 font-semibold">${escapeHtml(activeRegion.position)}</span></td>
                <td class="text-slate-300">${escapeHtml(activeRegion.address)}</td>
                <td class="font-mono text-slate-300 whitespace-nowrap">${escapeHtml(activeRegion.number || '—')}</td>
                <td class="font-mono text-amber-400 whitespace-nowrap">${escapeHtml(activeRegion.email || '—')}</td>
                <td class="text-center space-x-1 whitespace-nowrap">
                    <button type="button" onclick="editDirectoryRegionRow(${selectedDirectoryIndex})" class="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded text-[10px] font-bold">✏️ Edit Officials</button>
                    <button type="button" onclick="deleteDirectoryItem(${selectedDirectoryIndex})" class="px-2.5 py-1 bg-rose-950 hover:bg-rose-900 text-rose-300 border border-rose-800/60 rounded text-[10px] font-bold">🗑️ Delete</button>
                </td>
            </tr>
        ` : '';
    }
}

function editDirectoryRegionRow(index) {
    selectedDirectoryIndex = index;
    activeOfficialsRegionIndex = index;
    renderDirectoryTable();
    openRegionOfficialsPage(index);
}

function openRegionOfficialsPage(regionIdx) {
    ensureDirectoryOfficialsInitialized();
    if (regionIdx < 0 || regionIdx >= AppState.directory.length) return;
    activeOfficialsRegionIndex = regionIdx;
    selectedDirectoryIndex = regionIdx;

    const viewsToHide = ['viewLogs', 'viewAccomplishment', 'viewReports', 'viewWorkflow', 'viewClipboard', 'viewWorkday', 'viewDirectory', 'viewTemplate', 'viewUsers', 'viewSettings'];
    viewsToHide.forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
    });

    const offView = document.getElementById('viewDirectoryOfficials');
    if (offView) offView.style.display = 'flex';

    renderRegionOfficialsTable();
}

function backToDirectoryFromOfficials() {
    const offView = document.getElementById('viewDirectoryOfficials');
    if (offView) offView.style.display = 'none';
    switchMainTab('directory');
}

function renderRegionOfficialsTable() {
    ensureDirectoryOfficialsInitialized();
    const region = AppState.directory[activeOfficialsRegionIndex];
    const titleEl = document.getElementById('regionOfficialsPageTitle');
    const subEl = document.getElementById('regionOfficialsPageSubtitle');
    const tbody = document.getElementById('regionOfficialsTableBody');
    if (!region || !tbody) return;

    if (titleEl) {
        titleEl.textContent = `👔 ${region.office} (${region.code}) — Regional Director, Asst. RD & Chiefs`;
    }
    if (subEl) {
        subEl.textContent = `${region.address || ''} • ${region.email || ''}`;
    }

    const list = region.officials || [];
    if (list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center py-8 text-slate-400 text-xs">No officials listed for this region yet. Click <strong>+ Add Official</strong> above.</td></tr>`;
        return;
    }

    tbody.innerHTML = list.map((off, idx) => `
        <tr class="hover:bg-slate-800/40 transition">
            <td><span class="chip-pill">${escapeHtml(off.roleRank || 'Chief')}</span></td>
            <td class="font-bold text-white">${escapeHtml(off.name || '')}</td>
            <td class="text-sky-400 font-semibold">${escapeHtml(off.position || '')}</td>
            <td class="text-slate-300">${escapeHtml(off.division || region.office || '')}</td>
            <td class="font-mono text-amber-400">${escapeHtml(off.email || region.email || '—')}</td>
            <td class="font-mono text-slate-300">${escapeHtml(off.number || region.number || '—')}</td>
            <td class="text-center space-x-1 whitespace-nowrap">
                <button type="button" onclick="openOfficialModal(${idx})" class="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded text-[10px] font-bold">✏️ Edit</button>
                <button type="button" onclick="deleteOfficialItem(${idx})" class="px-2.5 py-1 bg-rose-950 hover:bg-rose-900 text-rose-300 border border-rose-800/60 rounded text-[10px] font-bold">🗑️ Delete</button>
            </td>
        </tr>
    `).join('');
}

function openOfficialModal(offIdx = null) {
    ensureDirectoryOfficialsInitialized();
    const modal = document.getElementById('officialModal');
    if (!modal) return;
    const region = AppState.directory[activeOfficialsRegionIndex];
    const list = region?.officials || [];

    if (offIdx !== null && offIdx !== undefined && list[offIdx]) {
        const off = list[offIdx];
        document.getElementById('editOfficialIndex').value = offIdx;
        document.getElementById('officialModalTitle').textContent = `Edit Official (${region.code})`;
        populateOfficialRoleRankDropdown(off.roleRank || 'Chief');
        document.getElementById('offChiefName').value = off.name || '';
        document.getElementById('offPosition').value = off.position || '';
        document.getElementById('offDivision').value = off.division || region.office || '';
        document.getElementById('offNumber').value = off.number || region.number || '';
        document.getElementById('offEmail').value = off.email || region.email || '';
    } else {
        document.getElementById('editOfficialIndex').value = '';
        document.getElementById('officialModalTitle').textContent = `Add Official (${region?.code || 'RO'})`;
        populateOfficialRoleRankDropdown('Chief');
        document.getElementById('offChiefName').value = '';
        document.getElementById('offPosition').value = 'Division Chief';
        document.getElementById('offDivision').value = region?.office || '';
        document.getElementById('offNumber').value = region?.number || '';
        document.getElementById('offEmail').value = region?.email || '';
    }
    modal.style.display = 'flex';
}

function closeOfficialModal() {
    const modal = document.getElementById('officialModal');
    if (modal) modal.style.display = 'none';
}

function saveOfficialForm(e) {
    e.preventDefault();
    ensureDirectoryOfficialsInitialized();
    const region = AppState.directory[activeOfficialsRegionIndex];
    if (!region) return;

    const item = {
        roleRank: document.getElementById('offRoleRank').value,
        name: document.getElementById('offChiefName').value.trim(),
        position: document.getElementById('offPosition').value.trim(),
        division: document.getElementById('offDivision').value.trim(),
        number: document.getElementById('offNumber').value.trim(),
        email: document.getElementById('offEmail').value.trim()
    };

    const editIdx = document.getElementById('editOfficialIndex').value;
    if (editIdx !== '') {
        region.officials[parseInt(editIdx, 10)] = item;
    } else {
        region.officials.push(item);
    }

    if (item.roleRank === 'Regional Director' || !region.chief) {
        region.chief = item.name;
        region.position = item.position || 'Regional Director';
        if (item.email) region.email = item.email;
    }

    saveDirectoryStorage();
    renderRegionOfficialsTable();
    renderDirectoryTable();
    closeOfficialModal();
    showToast("Regional official saved successfully.");
}

function deleteOfficialItem(offIdx) {
    ensureDirectoryOfficialsInitialized();
    const region = AppState.directory[activeOfficialsRegionIndex];
    if (!region) return;
    showSystemConfirm("Delete Official", "Remove this official from the region directory?", () => {
        region.officials.splice(offIdx, 1);
        saveDirectoryStorage();
        renderRegionOfficialsTable();
        renderDirectoryTable();
        showToast("Official removed.");
    });
}

function openDirectoryModal(index = null) {
    if (!isAdminTL() && !isSuperAdmin()) return;
    const modal = document.getElementById('directoryModal');
    if (!modal) return;

    if (index !== null && index !== undefined && AppState.directory[index]) {
        const d = AppState.directory[index];
        document.getElementById('editDirectoryIndex').value = index;
        document.getElementById('directoryModalTitle').textContent = `Edit Directory (${d.office})`;
        document.getElementById('dirAgencyCode').value = d.code || '';
        document.getElementById('dirOfficeName').value = d.office || '';
        document.getElementById('dirChiefName').value = d.chief || '';
        document.getElementById('dirPosition').value = d.position || 'Regional Director';
        document.getElementById('dirAddress').value = d.address || '';
        document.getElementById('dirNumber').value = d.number || '';
        document.getElementById('dirEmail').value = d.email || '';
    } else {
        document.getElementById('editDirectoryIndex').value = '';
        document.getElementById('directoryModalTitle').textContent = `Add LTO Directory Office`;
        document.getElementById('dirAgencyCode').value = 'RO';
        document.getElementById('dirOfficeName').value = '';
        document.getElementById('dirChiefName').value = '';
        document.getElementById('dirPosition').value = 'Regional Director';
        document.getElementById('dirAddress').value = '';
        document.getElementById('dirNumber').value = '';
        document.getElementById('dirEmail').value = '';
    }
    modal.style.display = 'flex';
}

function closeDirectoryModal() { document.getElementById('directoryModal').style.display = 'none'; }

function saveDirectoryForm(e) {
    e.preventDefault();
    const code = document.getElementById('dirAgencyCode').value.trim();
    const office = document.getElementById('dirOfficeName').value.trim();
    const chief = document.getElementById('dirChiefName').value.trim();
    const position = document.getElementById('dirPosition').value.trim();
    const address = document.getElementById('dirAddress').value.trim();
    const number = document.getElementById('dirNumber').value.trim();
    const email = document.getElementById('dirEmail').value.trim();

    const editIdx = document.getElementById('editDirectoryIndex').value;
    const existingOfficials = editIdx !== '' && AppState.directory[parseInt(editIdx, 10)]
        ? (AppState.directory[parseInt(editIdx, 10)].officials || [])
        : [];
    const dirData = { code, office, chief, position, address, number, email, officials: existingOfficials };

    if (editIdx !== '') {
        const parsedIdx = parseInt(editIdx, 10);
        AppState.directory[parsedIdx] = dirData;
        selectedDirectoryIndex = parsedIdx;
        activeOfficialsRegionIndex = parsedIdx;
    } else {
        AppState.directory.push(dirData);
        selectedDirectoryIndex = AppState.directory.length - 1;
        activeOfficialsRegionIndex = selectedDirectoryIndex;
    }

    saveDirectoryStorage();
    renderDirectoryTable();
    renderRegionOfficialsTable();
    closeDirectoryModal();
    showToast("LTO Directory saved successfully.");
}

function deleteDirectoryItem(idx) {
    showSystemConfirm("Delete Directory", "Are you sure you want to delete this entry?", () => {
        AppState.directory.splice(idx, 1);
        if (selectedDirectoryIndex >= AppState.directory.length) {
            selectedDirectoryIndex = Math.max(0, AppState.directory.length - 1);
        }
        saveDirectoryStorage();
        renderDirectoryTable();
        showToast("Directory entry deleted successfully.");
    });
}

function renderTemplateEditorUI() {
    getEndorsementFormConfig();
    populateEndorsementFormInputs();
    updateTemplateLivePreview();
}

function updateTemplateLivePreview() {
    const preview = document.getElementById('templateLivePreview');
    if (!preview) return;

    const sampleData = {
        todayDate: formatDayMonthYear(new Date()),
        dateReceivedFormatted: formatDayMonthYear(new Date()),
        chiefName: 'ELMER J. DECENA',
        chiefLastName: 'Decena',
        chiefPosition: 'Regional Director',
        agencyName: 'Land Transportation Office – IV-A',
        officeName: 'Regional Office 4-A',
        officeAddress: 'Lipa City, Batangas',
        emailAddress: 'dmsacltocalabarzon@gmail.com',
        rdmpaoEmail: 'dmsacltocalabarzon@gmail.com',
        complainantName: 'Mr. Arn Molenilla Mangalindan',
        complainantEmail: 'arnmangalindan@gmail.com',
        platform: 'Facebook Messenger',
        ticketSubjectTerm: 'complaint',
        forwardedClause: ' and subsequently forwarded to “Isumbong mo kay Chief” (ltoco.feedback@gmail.com)',
        briefDescription: 'against a motor vehicle with license plate number <strong>CDA4810</strong> and body number <strong>MB507</strong>, recklessly driven along E. Rodriguez Ave., Antipolo, Rizal',
        dueDate: addWorkingDays(getTodayMMDDYYYY(), 20),
        ticketRefNo: 'CPAO-11122026-36-44',
        includeShowCause: true,
        signatureBlock: '<div class="font-bold text-xs text-slate-800 pl-6 mb-1">[SIGNED]</div><p class="font-extrabold uppercase text-xs text-slate-900">MARY MAY M. JACOB</p><p class="text-slate-800 text-xs">Head, LTO Strategic Communications</p><p class="text-slate-700 text-xs">Central – Public Assistance Office</p>',
        attachmentHtml: ''
    };

    preview.innerHTML = renderStandardEndorsementLetterHtml(sampleData);
}

function saveEndorsementTemplate() {
    syncFormTemplateFields();
    saveAllSettingsToCloud();
    showToast("Formal endorsement template saved successfully.");
}

function resetDefaultEndorsementTemplate() {
    showSystemConfirm("Reset Template", "Are you sure you want to reset the endorsement template to default?", () => {
        AppState.settings.endorsementForm = { ...STANDARD_ENDORSEMENT_TEMPLATE_FIELDS };
        populateEndorsementFormInputs();
        updateTemplateLivePreview();
        saveAllSettingsToCloud();
        showToast("Template reset to default successfully.");
    });
}

function renderUsersTable() {
    const tbody = document.getElementById('userTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (!AppState.users || AppState.users.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" class="text-center py-8 text-slate-400 text-xs">No user accounts found. Click <strong>+ Add New User</strong> above.</td></tr>`;
        return;
    }

    AppState.users.forEach((u, idx) => {
        const tr = document.createElement('tr');
        const roleColor = u.role === 'Super Admin' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' : 'bg-blue-500/20 text-blue-400 border-blue-500/30';
        const colorBadge = u.logColor && u.logColor !== 'Default' ? `<span class="inline-block w-4 h-4 rounded-full border border-slate-600 align-middle" style="background:${u.logColor}"></span> ${u.logColor}` : 'Default';

        let privs = [];
        if(u.canReports) privs.push('Reports');
        if(u.canDeleteLogs) privs.push('Delete');
        if(u.canManageUsers) privs.push('Users');
        if(u.canAccessSettings) privs.push('Settings');
        const privsStr = privs.length > 0 ? privs.join(', ') : 'Standard Admin';

        tr.innerHTML = `
            <td class="font-bold text-white">${escapeHtml(u.username)}</td>
            <td>${escapeHtml(u.name || u.username)}</td>
            <td><span class="px-2 py-0.5 rounded text-[10px] font-extrabold border ${roleColor}">${escapeHtml(u.role || 'Admin')}</span></td>
            <td><span class="font-mono text-sky-400">${escapeHtml(u.defaultPortal || 'Any')}</span></td>
            <td class="text-[11px] text-slate-300">${escapeHtml(privsStr)}</td>
            <td>${colorBadge}</td>
            <td class="font-mono text-slate-400">••••••••</td>
            <td class="text-center space-x-1">
                <button type="button" onclick="openUserModal(${idx})" class="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-[10px] font-bold">✏️ Edit</button>
                <button type="button" onclick="deleteUserAccount(${idx})" class="px-2 py-1 bg-rose-950 hover:bg-rose-900 text-rose-300 rounded text-[10px] font-bold">🗑️</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function openUserModal(index = null) {
    if (!canUserManageUsers()) return;
    const modal = document.getElementById('userModal');
    if (!modal) return;

    const userPortal = document.getElementById('formUserDefaultPortal');
    if (userPortal && userPortal.options.length <= 1) populateDropdowns();

    if (index !== null && index !== undefined && AppState.users[index]) {
        const u = AppState.users[index];
        document.getElementById('editUserIndex').value = index;
        document.getElementById('userModalTitle').textContent = `Edit User Account (${u.username})`;
        document.getElementById('formUsername').value = u.username || '';
        document.getElementById('formUsername').readOnly = true;
        document.getElementById('formFullName').value = u.name || '';
        document.getElementById('formUserRole').value = u.role || 'Admin';
        document.getElementById('formUserPass').value = u.pass || '';
        document.getElementById('formUserDefaultPortal').value = u.defaultPortal || '';
        document.getElementById('formUserPortalStart').value = u.portalStartTime || '';
        document.getElementById('formUserPortalEnd').value = u.portalEndTime || '';
        document.getElementById('formCanReports').checked = !!u.canReports;
        document.getElementById('formCanDeleteLogs').checked = !!u.canDeleteLogs;
        document.getElementById('formCanManageUsers').checked = !!u.canManageUsers;
        document.getElementById('formCanAccessSettings').checked = !!u.canAccessSettings;

        const hasColor = u.logColor && u.logColor !== 'Default';
        document.getElementById('formEnableCustomColor').checked = hasColor;
        toggleColorPicker(hasColor);
        document.getElementById('formUserLogColor').value = hasColor ? u.logColor : '#9a4e2a';
    } else {
        document.getElementById('editUserIndex').value = '';
        document.getElementById('userModalTitle').textContent = `Create New User Account`;
        document.getElementById('formUsername').value = '';
        document.getElementById('formUsername').readOnly = false;
        document.getElementById('formFullName').value = '';
        document.getElementById('formUserRole').value = 'Admin';
        document.getElementById('formUserPass').value = 'password123';
        document.getElementById('formUserDefaultPortal').value = '';
        document.getElementById('formUserPortalStart').value = '';
        document.getElementById('formUserPortalEnd').value = '';
        document.getElementById('formCanReports').checked = false;
        document.getElementById('formCanDeleteLogs').checked = false;
        document.getElementById('formCanManageUsers').checked = false;
        document.getElementById('formCanAccessSettings').checked = false;
        document.getElementById('formEnableCustomColor').checked = false;
        toggleColorPicker(false);
        document.getElementById('formUserLogColor').value = '#9a4e2a';
    }
    modal.style.display = 'flex';
}

function closeUserModal() { document.getElementById('userModal').style.display = 'none'; }

function toggleColorPicker(enable) {
    const cp = document.getElementById('formUserLogColor');
    if (cp) { cp.disabled = !enable; cp.style.opacity = enable ? '1' : '0.5'; }
}

async function saveUserForm(e) {
    e.preventDefault();
    const username = document.getElementById('formUsername').value.trim();
    const name = document.getElementById('formFullName').value.trim();
    const role = document.getElementById('formUserRole').value;
    const pass = document.getElementById('formUserPass').value.trim();
    const defaultPortal = document.getElementById('formUserDefaultPortal').value;
    const portalStartTime = document.getElementById('formUserPortalStart').value;
    const portalEndTime = document.getElementById('formUserPortalEnd').value;
    const canReports = document.getElementById('formCanReports').checked;
    const canDeleteLogs = document.getElementById('formCanDeleteLogs').checked;
    const canManageUsers = document.getElementById('formCanManageUsers').checked;
    const canAccessSettings = document.getElementById('formCanAccessSettings').checked;
    const useCustomColor = document.getElementById('formEnableCustomColor').checked;
    const logColor = useCustomColor ? document.getElementById('formUserLogColor').value : 'Default';

    if (!username) {
        showSystemAlert("Validation Error", "Username is required.", "⚠️");
        return;
    }

    const editIdxStr = document.getElementById('editUserIndex').value;
    const editIdx = editIdxStr !== '' ? parseInt(editIdxStr, 10) : -1;
    const userData = { username, name, role, pass, defaultPortal, portalStartTime, portalEndTime, canReports, canDeleteLogs, canManageUsers, canAccessSettings, logColor };

    if (editIdx >= 0 && AppState.users[editIdx]) {
        AppState.users[editIdx] = userData;
    } else {
        const duplicateIdx = AppState.users.findIndex(
            u => String(u.username || '').trim().toLowerCase() === username.toLowerCase()
        );
        if (duplicateIdx !== -1) {
            showSystemAlert("Error", `Username "${username}" already exists.`, "❌");
            return;
        }
        AppState.users.push(userData);
    }

    await saveUsersStorage();
    renderUsersTable();
    closeUserModal();
    showToast("User account saved successfully.");
}

async function deleteUserAccount(idx) {
    const target = AppState.users[idx];
    if (target.username.toLowerCase() === currentUser.username.toLowerCase()) {
        showSystemAlert("Action Restricted", "You cannot delete your own active account while logged in.", "⚠️");
        return;
    }
    showSystemConfirm("Delete User", `Are you sure you want to delete user @${target.username}?`, async () => {
        AppState.users.splice(idx, 1);
        await saveUsersStorage();
        renderUsersTable();
        await fetchUsersFromCloud();
        showToast("User account deleted and synced.");
    });
}

function switchMainTab(tabName) {
    if (tabName === 'reports' && !canUserGenerateReports()) { showSystemAlert("Access Denied", "You do not have permission to access the Reports Generator.", "🔒"); return; }
    if (tabName === 'clipboard' && !isResponderClipboardEnabled()) { showSystemAlert("Disabled Feature", "Responder Clipboard is currently turned OFF by the Superadmin.", "🔒"); return; }
    if (tabName === 'directory' && !isAdminTL() && !isSuperAdmin()) { showSystemAlert("Access Denied", "You do not have permission to access the LTO Directory.", "🔒"); return; }
    if (tabName === 'template' && !isAdminTL() && !isSuperAdmin()) { showSystemAlert("Access Denied", "You do not have permission to access the Endorsement Template Builder.", "🔒"); return; }
    if (tabName === 'users' && !canUserManageUsers()) { showSystemAlert("Access Denied", "You do not have permission to manage User Accounts.", "🔒"); return; }
    if (tabName === 'settings' && !canUserAccessSettings()) { showSystemAlert("Access Denied", "You do not have permission to access Superadmin Settings.", "🔒"); return; }

    const offPage = document.getElementById('viewDirectoryOfficials');
    if (offPage) offPage.style.display = 'none';

    ['logs', 'accomplishment', 'reports', 'workflow', 'clipboard', 'workday', 'directory', 'template', 'users', 'settings'].forEach(t => {
        const view = document.getElementById('view' + t.charAt(0).toUpperCase() + t.slice(1));
        const btn = document.getElementById('tabBtn' + t.charAt(0).toUpperCase() + t.slice(1));
        if (t === tabName) {
            if(view) view.style.display = 'flex';
            if(btn) { btn.classList.add('text-sky-400', 'border-sky-400'); btn.classList.remove('text-slate-400', 'border-transparent'); }
            if(t === 'directory') renderDirectoryTable();
            if(t === 'template') renderTemplateEditorUI();
            if(t === 'users') renderUsersTable();
            if(t === 'settings') renderSettingsTables();
            if(t === 'reports') { loadReportConfigToUI(); if (!document.getElementById('repStartDate').value) setReportPreset('weekly'); else generateReport(); }
            if(t === 'accomplishment') { initAccomplishmentTab(); }
            if(t === 'workday') { renderCalcCalendar(); renderSavedOffDatesSummary(); }
        } else {
            if(view) view.style.display = 'none';
            if(btn) { btn.classList.remove('text-sky-400', 'border-sky-400'); btn.classList.add('text-slate-400', 'border-transparent'); }
        }
    });
}

function renderReportLogoPreviews() {
    const c = AppState.settings.reportConfig || {};
    [1, 2, 3].forEach(num => {
        const prevEl = document.getElementById(`logo${num}Preview`);
        if (!prevEl) return;
        const url = c[`logo${num}Url`] || "";
        if (url) {
            prevEl.innerHTML = `
                <img src="${url}" class="h-10 w-auto object-contain bg-white p-1 rounded border border-slate-700" />
                <button type="button" onclick="removeReportLogo(${num})" class="px-2 py-0.5 bg-rose-950 hover:bg-rose-900 text-rose-300 rounded text-[10px] font-bold">✕ Remove</button>
            `;
        } else {
            prevEl.innerHTML = `<span class="text-[10px] text-slate-500 italic">No logo uploaded</span>`;
        }
    });
}

function handleLogoUpload(event, logoNum) {
    const file = event?.target?.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const maxH = 140;
            const scale = img.height > maxH ? (maxH / img.height) : 1;
            canvas.width = Math.round(img.width * scale);
            canvas.height = Math.round(img.height * scale);
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            const dataUrl = canvas.toDataURL('image/png', 0.9);
            if (!AppState.settings.reportConfig) AppState.settings.reportConfig = {};
            AppState.settings.reportConfig[`logo${logoNum}Url`] = dataUrl;
            persistLocalSettingsCache();
            renderReportLogoPreviews();
            showToast(`Logo ${logoNum} loaded.`);
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

function removeReportLogo(logoNum) {
    if (!AppState.settings.reportConfig) AppState.settings.reportConfig = {};
    AppState.settings.reportConfig[`logo${logoNum}Url`] = "";
    const fileInput = document.getElementById(`cfgLogo${logoNum}File`);
    if (fileInput) fileInput.value = "";
    persistLocalSettingsCache();
    renderReportLogoPreviews();
    showToast(`Logo ${logoNum} removed.`);
}

function loadReportConfigToUI() {
    const c = AppState.settings.reportConfig || {};
    if(document.getElementById('cfgRepRepublic')) document.getElementById('cfgRepRepublic').value = c.republic || 'Republic of the Philippines';
    if(document.getElementById('cfgRepDept')) document.getElementById('cfgRepDept').value = c.department || 'Department of Transportation';
    if(document.getElementById('cfgRepAgency')) document.getElementById('cfgRepAgency').value = c.agency || 'LAND TRANSPORTATION OFFICE';
    if(document.getElementById('cfgRepOffice')) document.getElementById('cfgRepOffice').value = c.office || 'Central Public Assistance Office (CPAO)';
    if(document.getElementById('cfgLogoAlignment')) document.getElementById('cfgLogoAlignment').value = c.logoAlignment || 'left';
    if(document.getElementById('cfgHeaderTextAlign')) document.getElementById('cfgHeaderTextAlign').value = c.headerTextAlign || 'center';
    if(document.getElementById('cfgHeaderSpacing')) document.getElementById('cfgHeaderSpacing').value = c.headerSpacing || 'standard';
    if(document.getElementById('cfgNotedName')) document.getElementById('cfgNotedName').value = c.notedName || 'MARY MAY M. JACOB';
    if(document.getElementById('cfgNotedDesig')) document.getElementById('cfgNotedDesig').value = c.notedDesig || 'Head, LTO COMMS/CPAO';
    renderReportLogoPreviews();
}

function saveReportConfig() {
    const prevCfg = AppState.settings.reportConfig || {};
    AppState.settings.reportConfig = {
        ...prevCfg,
        republic: document.getElementById('cfgRepRepublic').value.trim(),
        department: document.getElementById('cfgRepDept').value.trim(),
        agency: document.getElementById('cfgRepAgency').value.trim(),
        office: document.getElementById('cfgRepOffice').value.trim(),
        logo1Url: prevCfg.logo1Url || "",
        logo2Url: prevCfg.logo2Url || "",
        logo3Url: prevCfg.logo3Url || "",
        logoAlignment: document.getElementById('cfgLogoAlignment').value,
        headerTextAlign: document.getElementById('cfgHeaderTextAlign').value,
        headerSpacing: document.getElementById('cfgHeaderSpacing').value,
        notedName: document.getElementById('cfgNotedName').value.trim(),
        notedDesig: document.getElementById('cfgNotedDesig').value.trim()
    };
    persistLocalSettingsCache();
    saveAllSettingsToCloud(true);
    closeReportConfigModal();
    generateReport();
    if (document.getElementById('viewAccomplishment')?.style.display !== 'none') {
        generateAccomplishmentReport();
    }
    showToast("Header configuration and logos saved!");
}

function setReportPreset(preset) {
    const now = new Date();
    let start = new Date();
    let end = new Date(now);

    if (preset === 'weekly') {
        const day = now.getDay();
        const diffToMonday = day === 0 ? -6 : 1 - day;
        start = new Date(now); start.setDate(now.getDate() + diffToMonday);
        end = new Date(start); end.setDate(start.getDate() + 6);
    } else if (preset === 'monthly') {
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    } else if (preset === 'semiannual') {
        const m = now.getMonth();
        if (m < 6) { start = new Date(now.getFullYear(), 0, 1); end = new Date(now.getFullYear(), 5, 30); }
        else { start = new Date(now.getFullYear(), 6, 1); end = new Date(now.getFullYear(), 11, 31); }
    } else if (preset === 'annual') {
        start = new Date(now.getFullYear(), 0, 1);
        end = new Date(now.getFullYear(), 11, 31);
    }

    const fmt = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    setSystemDateInputValue('repStartDate', fmt(start));
    setSystemDateInputValue('repEndDate', fmt(end));
    generateReport();
}

function resolveBarFillHex(barColorClass) {
    if (String(barColorClass).includes("teal")) return "#0d9488";
    if (String(barColorClass).includes("emerald")) return "#059669";
    if (String(barColorClass).includes("amber")) return "#d97706";
    return "#2563eb";
}

function buildReportPageHeaderHtml(cfg, startISO, endISO, overallEfficiency, resolvedCount, totalReceived, pageSubtitle = "") {
    const logo1 = cfg.logo1Url && cfg.logo1Url.trim() !== '' ? cfg.logo1Url : '';
    const logo2 = cfg.logo2Url && cfg.logo2Url.trim() !== '' ? cfg.logo2Url : '';
    const logo3 = cfg.logo3Url && cfg.logo3Url.trim() !== '' ? cfg.logo3Url : '';
    const orderedLogos = [logo1, logo2, logo3].filter(Boolean);

    const logoAlignment = cfg.logoAlignment || 'left';
    const textAlign = cfg.headerTextAlign || 'center';
    const spacing = cfg.headerSpacing || 'standard';

    const textAlignClass = textAlign === 'left' ? 'text-left' : (textAlign === 'right' ? 'text-right' : 'text-center');
    const padClass = spacing === 'compact' ? 'pb-2' : (spacing === 'spacious' ? 'pb-5' : 'pb-3');

    const textBlockHtml = `
        <div class="${textAlignClass} space-y-0.5 flex-1">
            <p class="text-[10px] font-bold tracking-widest text-slate-600 uppercase">${escapeHtml(cfg.republic || 'Republic of the Philippines')}</p>
            <p class="text-[10.5px] font-bold tracking-wider text-slate-700 uppercase">${escapeHtml(cfg.department || 'Department of Transportation')}</p>
            <h3 class="font-extrabold text-sm text-slate-900 tracking-tight uppercase">${escapeHtml(cfg.agency || 'LAND TRANSPORTATION OFFICE')}</h3>
            <h4 class="font-bold text-xs text-blue-900 uppercase">${escapeHtml(cfg.office || 'Central Public Assistance Office (CPAO)')}</h4>
        </div>
    `;

    let headerContentBlock = textBlockHtml;

    if (orderedLogos.length > 0) {
        if (logoAlignment === 'sides') {
            const leftLogoHtml = logo1 ? `<img src="${logo1}" class="h-12 w-auto object-contain shrink-0" />` : `<div class="w-12 shrink-0"></div>`;
            const rightLogos = [logo2, logo3].filter(Boolean);
            const rightLogosHtml = rightLogos.length > 0
                ? `<div class="flex items-center gap-2 shrink-0">${rightLogos.map(u => `<img src="${u}" class="h-12 w-auto object-contain" />`).join('')}</div>`
                : `<div class="w-12 shrink-0"></div>`;
            headerContentBlock = `
                <div class="flex items-center justify-between gap-4 mb-1">
                    ${leftLogoHtml}
                    ${textBlockHtml}
                    ${rightLogosHtml}
                </div>
            `;
        } else if (logoAlignment === 'right') {
            headerContentBlock = `
                <div class="flex items-center justify-between gap-4 mb-1">
                    ${textBlockHtml}
                    <div class="flex items-center gap-2 shrink-0">${orderedLogos.map(url => `<img src="${url}" class="h-12 w-auto object-contain" />`).join('')}</div>
                </div>
            `;
        } else {
            // Left alignment: Logo 1 is always far-left
            headerContentBlock = `
                <div class="flex items-center justify-start gap-4 mb-1">
                    <div class="flex items-center gap-2 shrink-0">${orderedLogos.map(url => `<img src="${url}" class="h-12 w-auto object-contain" />`).join('')}</div>
                    ${textBlockHtml}
                </div>
            `;
        }
    }

    const metaRowHtml = (startISO && endISO) ? `
        <div class="flex justify-between items-center text-[11px] text-slate-700 bg-slate-50 px-3 py-2 rounded-lg border border-slate-300">
            <div>
                <span class="font-bold uppercase text-slate-500 text-[9.5px] block">Period Covered:</span>
                <span class="font-mono font-bold text-slate-900">${isoToMMDDYYYY(startISO)} — ${isoToMMDDYYYY(endISO)}</span>
            </div>
            ${pageSubtitle ? `<div class="text-center font-extrabold uppercase text-[10.5px] text-slate-800 tracking-wide">${escapeHtml(pageSubtitle)}</div>` : ''}
            <div class="text-right">
                <span class="font-bold uppercase text-slate-500 text-[9.5px] block">Resolution Rate:</span>
                <span class="font-mono font-extrabold text-blue-900">${overallEfficiency}% (${resolvedCount}/${totalReceived})</span>
            </div>
        </div>
    ` : '';

    return `
        <div class="space-y-3">
            <div class="border-b-2 border-slate-800 ${padClass}">${headerContentBlock}</div>
            ${metaRowHtml}
        </div>
    `;
}

function exportReportCSV() {
    if (!canUserGenerateReports()) return;
    const startISO = document.getElementById('repStartDate').value;
    const endISO = document.getElementById('repEndDate').value;
    if (!startISO || !endISO) return;
    const filtered = AppState.tickets.filter(t => {
        const iso = mmddyyyyToISO(t.dateReceived);
        return new Date(iso) >= new Date(startISO) && new Date(iso) <= new Date(endISO);
    });
    let csv = 'Admin No,Platform,Ticket No,Date Received,Category Group,Category,Type,Complainant,Details,Response,Action Taken,Status,Remarks\n' +
        filtered.map(t => `"${t.adminNo}","${t.platform}","${t.referralNo}","${t.dateReceived}","${getGroupForCategory(t.category)}","${t.category}","${t.ticketType}","${t.complainantName}","${(t.ticketDetails || '').replace(/"/g, '""')}","${(t.responseDetails || '').replace(/"/g, '""')}","${t.actionTaken}","${t.status}","${t.remarks}"`).join('\n');
    let blob = new Blob([csv], { type: 'text/csv' });
    let a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `Report_${startISO}_to_${endISO}.csv`; a.click();
}

/* ============================================================================
   ACCOMPLISHMENT REPORT MODULE (AVAILABLE TO SUPERADMIN, ADMINTL, AND ADMIN)
   ============================================================================ */

function loadCustomAccomplishmentsStorage() {
    try {
        const raw = localStorage.getItem(CUSTOM_ACCOMPLISHMENTS_KEY);
        if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
                customAccomplishments = parsed;
                return;
            }
        }
    } catch (e) {}
    customAccomplishments = [];
}

function saveCustomAccomplishmentsStorage() {
    try {
        localStorage.setItem(CUSTOM_ACCOMPLISHMENTS_KEY, JSON.stringify(customAccomplishments));
    } catch (e) {}
}

function initAccomplishmentTab() {
    const startEl = document.getElementById('accStartDate');
    const endEl = document.getElementById('accEndDate');
    const customDateEl = document.getElementById('customAccDateInput');
    if (customDateEl && !customDateEl.value) setSystemDateInputValue('customAccDateInput', getTodayISO());

    const scopeSel = document.getElementById('accAdminScope');
    if (scopeSel && !isSuperAdmin() && !isAdminTL()) {
        scopeSel.value = 'my';
        scopeSel.disabled = true;
    } else if (scopeSel) {
        scopeSel.disabled = false;
    }

    if (startEl && endEl && (!startEl.value || !endEl.value)) {
        setAccomplishmentPreset('today');
    } else {
        renderCustomAccomplishmentsManageList();
        generateAccomplishmentReport();
    }
}

function setAccomplishmentPreset(preset) {
    const now = new Date();
    // Use currently selected accStartDate's year/month if set for 1st/2nd cutoff, otherwise current month
    const curStartVal = document.getElementById('accStartDate')?.value || '';
    let refYear = now.getFullYear();
    let refMonth = now.getMonth();
    if (curStartVal && /^\d{4}-\d{2}-\d{2}$/.test(curStartVal)) {
        const p = curStartVal.split('-');
        refYear = parseInt(p[0], 10);
        refMonth = parseInt(p[1], 10) - 1;
    }

    let start = new Date(now);
    let end = new Date(now);

    if (preset === '1st_cutoff') {
        start = new Date(refYear, refMonth, 1);
        end = new Date(refYear, refMonth, 15);
    } else if (preset === '2nd_cutoff') {
        start = new Date(refYear, refMonth, 16);
        end = new Date(refYear, refMonth + 1, 0);
    } else if (preset === 'weekly') {
        const day = now.getDay();
        const diffToMonday = day === 0 ? -6 : 1 - day;
        start = new Date(now); start.setDate(now.getDate() + diffToMonday);
        end = new Date(start); end.setDate(start.getDate() + 6);
    } else if (preset === 'monthly') {
        start = new Date(refYear, refMonth, 1);
        end = new Date(refYear, refMonth + 1, 0);
    }

    const fmt = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    setSystemDateInputValue('accStartDate', fmt(start));
    setSystemDateInputValue('accEndDate', fmt(end));
    renderCustomAccomplishmentsManageList();
    generateAccomplishmentReport();
}

function saveCustomAccomplishment(e) {
    e.preventDefault();
    const textInput = document.getElementById('customAccTitleInput');
    const dateInput = document.getElementById('customAccDateInput');
    const editIdxInput = document.getElementById('editCustomAccIndex');

    const text = (textInput?.value || '').trim();
    if (!text) return;
    const dateIso = dateInput?.value || getTodayISO();
    const editIdxStr = editIdxInput?.value ?? '';

    if (editIdxStr !== '' && customAccomplishments[parseInt(editIdxStr, 10)]) {
        const idx = parseInt(editIdxStr, 10);
        customAccomplishments[idx] = {
            ...customAccomplishments[idx],
            text,
            dateIso
        };
        showToast("Accomplishment item updated.");
    } else {
        customAccomplishments.push({
            id: 'ACC_' + Date.now(),
            text,
            dateIso,
            ownerUsername: currentUser.username || '',
            ownerAdminNo: currentUser.adminNo || deriveOperatorAdminNo(currentUser)
        });
        showToast("Accomplishment added after portal ticket list.");
    }

    saveCustomAccomplishmentsStorage();
    cancelEditCustomAccomplishment();
    renderCustomAccomplishmentsManageList();
    generateAccomplishmentReport();
}

function editCustomAccomplishment(idx) {
    const item = customAccomplishments[idx];
    if (!item) return;
    document.getElementById('editCustomAccIndex').value = String(idx);
    document.getElementById('customAccTitleInput').value = item.text || '';
    setSystemDateInputValue('customAccDateInput', item.dateIso || getTodayISO());
    document.getElementById('accFormHeaderLabel').textContent = "✏️ Edit Accomplishment Item";
    document.getElementById('btnSaveCustomAcc').textContent = "Update Item";
    document.getElementById('btnCancelEditAccItem').classList.remove('hidden');
    document.getElementById('customAccTitleInput').focus();
}

function cancelEditCustomAccomplishment() {
    const editIdxEl = document.getElementById('editCustomAccIndex');
    const titleEl = document.getElementById('customAccTitleInput');
    const dateEl = document.getElementById('customAccDateInput');
    const headerEl = document.getElementById('accFormHeaderLabel');
    const btnEl = document.getElementById('btnSaveCustomAcc');
    const cancelBtn = document.getElementById('btnCancelEditAccItem');
    if (editIdxEl) editIdxEl.value = '';
    if (titleEl) titleEl.value = '';
    setSystemDateInputValue('customAccDateInput', getTodayISO());
    if (headerEl) headerEl.textContent = "➕ Add Accomplishment (Auto-inserted after Portal Ticket List)";
    if (btnEl) btnEl.textContent = "+ Add Accomplishment";
    if (cancelBtn) cancelBtn.classList.add('hidden');
}

function deleteCustomAccomplishment(idx) {
    showSystemConfirm("Remove Accomplishment", "Remove this accomplishment item from the report?", () => {
        customAccomplishments.splice(idx, 1);
        saveCustomAccomplishmentsStorage();
        cancelEditCustomAccomplishment();
        renderCustomAccomplishmentsManageList();
        generateAccomplishmentReport();
        showToast("Accomplishment removed.");
    });
}

function renderCustomAccomplishmentsManageList() {
    const listEl = document.getElementById('customAccomplishmentsManageList');
    if (!listEl) return;

    const scope = document.getElementById('accAdminScope')?.value || 'my';
    const visibleItems = customAccomplishments
        .map((item, idx) => ({ item, idx }))
        .filter(({ item }) => {
            if (scope === 'all') return true;
            return String(item.ownerUsername || '').toLowerCase() === String(currentUser.username || '').toLowerCase() ||
                   String(item.ownerAdminNo || '').toLowerCase() === String(currentUser.adminNo || '').toLowerCase();
        });

    if (visibleItems.length === 0) {
        listEl.innerHTML = `<p class="text-[11px] text-slate-500 italic">No custom accomplishments added yet.</p>`;
        return;
    }

    listEl.innerHTML = visibleItems.map(({ item, idx }) => `
        <div class="flex items-center justify-between gap-2 bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5">
            <div class="min-w-0">
                <span class="text-white font-semibold block truncate">${escapeHtml(item.text)}</span>
                <span class="text-[10px] font-mono text-slate-400">${escapeHtml(isoToMMDDYYYY(item.dateIso || ''))}</span>
            </div>
            <div class="flex items-center gap-1 shrink-0">
                <button type="button" onclick="editCustomAccomplishment(${idx})" class="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded text-[10px] font-bold">✏️</button>
                <button type="button" onclick="deleteCustomAccomplishment(${idx})" class="px-2 py-0.5 bg-rose-950 hover:bg-rose-900 text-rose-300 rounded text-[10px] font-bold">🗑️</button>
            </div>
        </div>
    `).join('');
}

function setAccomplishmentPreviewEditState(editing) {
    isAccomplishmentPreviewEditing = !!editing;
    const docEl = document.getElementById("printableAccomplishmentDocument");
    const btn = document.getElementById("btnToggleEditAccPreview");
    const badge = document.getElementById("accEditModeBadge");

    if (docEl) {
        docEl.contentEditable = isAccomplishmentPreviewEditing ? "true" : "false";
        if (isAccomplishmentPreviewEditing) {
            docEl.classList.add("ring-2", "ring-amber-400");
            docEl.focus();
        } else {
            docEl.classList.remove("ring-2", "ring-amber-400");
        }
    }

    if (btn) {
        if (isAccomplishmentPreviewEditing) {
            btn.textContent = "✅ Done Editing";
            btn.className = "px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg shadow transition";
        } else {
            btn.textContent = "✏️ Edit Report";
            btn.className = "px-3.5 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-lg shadow transition";
        }
    }

    if (badge) {
        badge.classList.toggle("hidden", !isAccomplishmentPreviewEditing);
    }
}

function toggleEditAccomplishmentPreview() {
    if (!document.getElementById("printableAccomplishmentDocument")) {
        generateAccomplishmentReport();
    }
    setAccomplishmentPreviewEditState(!isAccomplishmentPreviewEditing);
    showToast(isAccomplishmentPreviewEditing ? "Accomplishment report editing enabled." : "Edits applied.");
}

function formatAccomplishmentPeriodHeading(startISO, endISO) {
    const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const s = new Date(startISO + "T12:00:00");
    const e = new Date(endISO + "T12:00:00");
    if (isNaN(s.getTime()) || isNaN(e.getTime())) return `${startISO} to ${endISO}`;

    const sMonth = months[s.getMonth()];
    const eMonth = months[e.getMonth()];
    const sDay = String(s.getDate()).padStart(2, "0");
    const eDay = String(e.getDate()).padStart(2, "0");
    const sYear = s.getFullYear();
    const eYear = e.getFullYear();

    if (startISO === endISO) {
        return `For ${sMonth} ${sDay}, ${sYear}`;
    }
    if (sYear === eYear && s.getMonth() === e.getMonth()) {
        return `For the Period of ${sMonth} ${sDay} to ${eDay}, ${sYear}`;
    }
    if (sYear === eYear) {
        return `For the Period of ${sMonth} ${sDay} to ${eMonth} ${eDay}, ${sYear}`;
    }
    return `For the Period of ${sMonth} ${sDay}, ${sYear} to ${eMonth} ${eDay}, ${eYear}`;
}

function generateAccomplishmentReport() {
    setAccomplishmentPreviewEditState(false);
    const startISO = document.getElementById('accStartDate')?.value || getTodayISO();
    const endISO = document.getElementById('accEndDate')?.value || getTodayISO();
    const scope = document.getElementById('accAdminScope')?.value || 'my';

    const startDate = new Date(startISO + "T00:00:00");
    const endDate = new Date(endISO + "T23:59:59");

    const filteredTickets = (AppState.tickets || []).filter(t => {
        if (!t.dateReceived) return false;
        const iso = mmddyyyyToISO(t.dateReceived);
        const tDate = new Date(iso + "T12:00:00");
        if (tDate < startDate || tDate > endDate) return false;
        if (scope === 'my' && !isTicketOwnedByCurrentUser(t)) return false;
        return true;
    });

    // Group stats strictly per portal so each portal gets its own separate bullet
    const portalOrder = [];
    const portalBreakdown = {};

    filteredTickets.forEach(t => {
        const portalName = String(t.platform || 'OTHER PORTAL').trim().toUpperCase();
        if (!portalBreakdown[portalName]) {
            portalBreakdown[portalName] = { received: 0, resolved: 0, pending: 0 };
            portalOrder.push(portalName);
        }
        portalBreakdown[portalName].received++;
        const isClosed = String(t.status || '').trim().toLowerCase() === 'closed';
        if (isClosed) portalBreakdown[portalName].resolved++;
        else portalBreakdown[portalName].pending++;
    });

    const formatPortalDisplayTitle = (portalCode) => {
        if (portalCode === 'FACEBOOK') return 'LTO Facebook Messenger and Comment Section';
        return `${portalCode} Portal`;
    };

    const portalBulletsHtml = portalOrder.length === 0
        ? `<li>Responded to queries received from assigned portals: <strong>0 tickets, 0 resolved, 0 pending</strong>;</li>`
        : portalOrder.map(portal => {
            const st = portalBreakdown[portal];
            const label = formatPortalDisplayTitle(portal);
            return `<li>Responded to queries received from the <strong>${escapeHtml(label)}: ${st.received} tickets, ${st.resolved} resolved, ${st.pending} pending</strong>;</li>`;
        }).join('');

    // Auto-insert custom accomplishments right after the portal ticket bullets
    const matchingCustomAccs = customAccomplishments.filter(item => {
        if (scope === 'my') {
            const sameOwner = String(item.ownerUsername || '').toLowerCase() === String(currentUser.username || '').toLowerCase() ||
                              String(item.ownerAdminNo || '').toLowerCase() === String(currentUser.adminNo || '').toLowerCase();
            if (!sameOwner) return false;
        }
        if (!item.dateIso) return true;
        const d = new Date(item.dateIso + "T12:00:00");
        return d >= startDate && d <= endDate;
    });

    const customBulletsHtml = matchingCustomAccs.map(item => {
        const cleanTxt = String(item.text || '').trim();
        const withSemicolon = /[;.]$/.test(cleanTxt) ? cleanTxt : `${cleanTxt};`;
        return `<li>${escapeHtml(withSemicolon)}</li>`;
    }).join('');

    const cfg = AppState.settings.reportConfig || {};
    const periodHeading = formatAccomplishmentPeriodHeading(startISO, endISO);

    const operatorDisplayName = scope === 'all'
        ? 'ALL CPAO / PAT-SMT OPERATORS'
        : String(currentUser.name || currentUser.username || 'ADMIN').toUpperCase();

    const matchedSignatory = REPORT_SIGNATORIES.find(
        s => s.name.toLowerCase() === operatorDisplayName.toLowerCase()
    );
    const operatorDesignation = scope === 'all'
        ? 'Central Public Assistance Office'
        : (matchedSignatory ? matchedSignatory.designation : 'Public Relation Officer I');

    const approvedByName = cfg.notedName || 'MARY MAY M. JACOB';
    const approvedByDesig = cfg.notedDesig || 'Head, LTO-COMMS/CPAO';

    const container = document.getElementById('accomplishmentReportContainer');
    if (!container) return;

    container.innerHTML = `
        <div id="printableAccomplishmentDocument" class="space-y-6">
            <section class="report-a4-page" style="justify-content: flex-start; padding: 22mm 20mm;">
                <div class="text-center mb-10">
                    <h2 class="font-bold text-base sm:text-lg text-black tracking-normal">Accomplishment Report</h2>
                    <p class="font-bold text-base sm:text-lg text-black mt-0.5">${escapeHtml(periodHeading)}</p>
                </div>

                <div class="pl-4 sm:pl-8 pr-2">
                    <ul class="list-disc pl-6 space-y-3 text-sm sm:text-[15px] text-black leading-relaxed">
                        ${portalBulletsHtml}
                        ${customBulletsHtml}
                    </ul>
                </div>

                <div class="mt-24 pt-6 grid grid-cols-2 gap-8 text-sm sm:text-[15px] text-black">
                    <div class="text-center">
                        <p class="text-left pl-6 sm:pl-12 mb-12">Submitted by:</p>
                        <p class="font-bold uppercase text-black">${escapeHtml(operatorDisplayName)}</p>
                        <p class="text-black mt-0.5">${escapeHtml(operatorDesignation)}</p>
                    </div>
                    <div class="text-center">
                        <p class="text-left pl-6 sm:pl-12 mb-12">Approved by:</p>
                        <p class="font-bold uppercase text-black">${escapeHtml(approvedByName)}</p>
                        <p class="text-black mt-0.5">${escapeHtml(approvedByDesig)}</p>
                    </div>
                </div>
            </section>
        </div>
    `;
}

function printAccomplishmentReport() {
    if (!document.getElementById('printableAccomplishmentDocument')) generateAccomplishmentReport();
    if (isAccomplishmentPreviewEditing) setAccomplishmentPreviewEditState(false);
    document.body.classList.add('printing-accomplishment');
    setTimeout(() => {
        window.print();
        setTimeout(() => document.body.classList.remove('printing-accomplishment'), 400);
    }, 150);
}

function populateEndorseChiefDropdown(regionIdx, preferredName = "") {
    const chiefSel = document.getElementById('endChiefNameSelect');
    if (!chiefSel) return;

    const officials = getRegionOfficialsList(regionIdx);
    const entry = AppState.directory[regionIdx];

    if (officials.length > 0) {
        chiefSel.innerHTML = officials.map((off, idx) => {
            const rankLabel = off.roleRank ? `[${off.roleRank}] ` : '';
            return `<option value="${idx}">${escapeHtml(rankLabel + (off.name || ''))}</option>`;
        }).join('');

        let selectedOffIdx = 0;
        if (preferredName) {
            const matched = officials.findIndex(o => String(o.name || '').trim().toLowerCase() === String(preferredName).trim().toLowerCase());
            if (matched >= 0) selectedOffIdx = matched;
        }
        chiefSel.value = String(selectedOffIdx);
        onEndorseChiefDropdownChange(String(selectedOffIdx));
    } else if (entry && entry.chief) {
        chiefSel.innerHTML = `<option value="-1">[Regional Director] ${escapeHtml(entry.chief)}</option>`;
        chiefSel.value = "-1";
        document.getElementById('endChiefName').value = entry.chief || "";
        document.getElementById('endPosition').value = entry.position || "Regional Director";
        if (entry.email) document.getElementById('endEmailAddress').value = entry.email;
    } else {
        chiefSel.innerHTML = `<option value="">-- No Official Listed --</option>`;
    }
}

function onEndorseChiefDropdownChange(selectedVal) {
    const regionIdx = parseInt(document.getElementById('endOfficeSelect')?.value || '0', 10);
    const entry = AppState.directory[regionIdx];
    const officials = getRegionOfficialsList(regionIdx);
    const parsedIdx = parseInt(selectedVal, 10);

    if (!isNaN(parsedIdx) && parsedIdx >= 0 && officials[parsedIdx]) {
        const off = officials[parsedIdx];
        document.getElementById('endChiefName').value = off.name || "";
        if (off.position) document.getElementById('endPosition').value = off.position;
        if (off.email) document.getElementById('endEmailAddress').value = off.email;
    } else if (entry) {
        document.getElementById('endChiefName').value = entry.chief || "";
        if (entry.position) document.getElementById('endPosition').value = entry.position;
        if (entry.email) document.getElementById('endEmailAddress').value = entry.email;
    }
}

let endorseAttachmentsList = [];
let endorseAttachmentArrangeMode = "custom";
let endorseAttachmentLayoutMode = "page_per_item";
let endorsePreviewPages = [];
let endorseShowAttachmentLabels = true;
let draggedEndorseAttachmentIndex = null;

function isSupportedEndorseFile(file) {
    if (!file) return false;
    const type = String(file.type || "").toLowerCase();
    const name = String(file.name || "").toLowerCase();
    if (type === "application/pdf" || name.endsWith(".pdf")) return true;
    if (type.startsWith("image/") || /\.(png|jpe?g|gif|webp|bmp|svg)$/.test(name)) return true;
    return false;
}

function getEndorseFileKind(file) {
    const type = String(file?.type || "").toLowerCase();
    const name = String(file?.name || "").toLowerCase();
    return (type === "application/pdf" || name.endsWith(".pdf")) ? "pdf" : "image";
}

function formatReadableFileSize(bytes) {
    const num = Number(bytes || 0);
    if (num < 1024) return `${num} B`;
    if (num < 1024 * 1024) return `${(num / 1024).toFixed(1)} KB`;
    return `${(num / (1024 * 1024)).toFixed(2)} MB`;
}

function triggerEndorseFilePicker() {
    const fileInput = document.getElementById("endAttachmentFiles");
    if (fileInput) fileInput.click();
}

function handleEndorseDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    const dz = document.getElementById("endAttachmentDropzone");
    if (dz) dz.classList.add("border-sky-400", "bg-sky-950/30");
}

function handleEndorseDragLeave(e) {
    e.preventDefault();
    e.stopPropagation();
    const dz = document.getElementById("endAttachmentDropzone");
    if (dz) dz.classList.remove("border-sky-400", "bg-sky-950/30");
}

function handleEndorseFilesDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    const dz = document.getElementById("endAttachmentDropzone");
    if (dz) dz.classList.remove("border-sky-400", "bg-sky-950/30");
    if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        addFilesToEndorseAttachments(e.dataTransfer.files);
    }
}

function handleEndorseFilesSelected(e) {
    const files = e?.target?.files;
    if (files && files.length > 0) {
        addFilesToEndorseAttachments(files);
    }
    if (e && e.target) {
        e.target.value = "";
    }
}

async function inspectPdfPageCount(file) {
    try {
        if (!window.pdfjsLib) return null;
        const arrayBuffer = await file.arrayBuffer();
        const pdfDoc = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        return pdfDoc ? pdfDoc.numPages : null;
    } catch (err) {
        return null;
    }
}

function addFilesToEndorseAttachments(fileList) {
    const incoming = Array.from(fileList || []);
    if (!incoming.length) return;

    let addedCount = 0;
    let skippedCount = 0;

    incoming.forEach((file) => {
        if (!isSupportedEndorseFile(file)) {
            skippedCount++;
            return;
        }
        const kind = getEndorseFileKind(file);
        const item = {
            id: "att_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8),
            file: file,
            name: file.name || (kind === "pdf" ? "Document.pdf" : "Image.png"),
            size: file.size || 0,
            kind: kind,
            mimeType: file.type || (kind === "pdf" ? "application/pdf" : "image/png"),
            previewUrl: "",
            pageCount: null
        };
        endorseAttachmentsList.push(item);
        addedCount++;

        if (kind === "image") {
            const reader = new FileReader();
            reader.onload = (evt) => {
                item.previewUrl = evt.target.result;
                renderEndorseAttachmentList();
            };
            reader.readAsDataURL(file);
        } else if (kind === "pdf") {
            inspectPdfPageCount(file).then((pages) => {
                item.pageCount = pages;
                renderEndorseAttachmentList();
            });
        }
    });

    if (endorseAttachmentArrangeMode !== "custom") {
        applyEndorseAttachmentArrange(endorseAttachmentArrangeMode, false);
    } else {
        renderEndorseAttachmentList();
    }

    if (skippedCount > 0) {
        showToast(`${addedCount} file(s) added. ${skippedCount} unsupported file(s) skipped.`);
    } else if (addedCount > 0) {
        showToast(`${addedCount} file(s) attached (Total: ${endorseAttachmentsList.length}).`);
    }
}

function applyEndorseAttachmentArrange(mode, notify = true) {
    endorseAttachmentArrangeMode = mode || "custom";
    const sel = document.getElementById("endAttachmentArrangeMode");
    if (sel) sel.value = endorseAttachmentArrangeMode;

    if (endorseAttachmentArrangeMode === "name_asc") {
        endorseAttachmentsList.sort((a, b) => String(a.name).localeCompare(String(b.name), undefined, { numeric: true, sensitivity: "base" }));
    } else if (endorseAttachmentArrangeMode === "name_desc") {
        endorseAttachmentsList.sort((a, b) => String(b.name).localeCompare(String(a.name), undefined, { numeric: true, sensitivity: "base" }));
    } else if (endorseAttachmentArrangeMode === "images_first") {
        endorseAttachmentsList.sort((a, b) => {
            if (a.kind === b.kind) return 0;
            return a.kind === "image" ? -1 : 1;
        });
    } else if (endorseAttachmentArrangeMode === "pdfs_first") {
        endorseAttachmentsList.sort((a, b) => {
            if (a.kind === b.kind) return 0;
            return a.kind === "pdf" ? -1 : 1;
        });
    }

    renderEndorseAttachmentList();
    if (notify && endorseAttachmentsList.length > 1) {
        showToast("Attachment arrangement updated.");
    }
}

function onEndorseLayoutModeChange(mode) {
    endorseAttachmentLayoutMode = mode || "page_per_item";
}

function moveEndorseAttachment(index, direction) {
    if (index < 0 || index >= endorseAttachmentsList.length) return;
    let targetIdx = index;
    if (direction === "top") targetIdx = 0;
    else if (direction === "up") targetIdx = Math.max(0, index - 1);
    else if (direction === "down") targetIdx = Math.min(endorseAttachmentsList.length - 1, index + 1);
    else if (direction === "bottom") targetIdx = endorseAttachmentsList.length - 1;

    if (targetIdx === index) return;
    const [moved] = endorseAttachmentsList.splice(index, 1);
    endorseAttachmentsList.splice(targetIdx, 0, moved);

    endorseAttachmentArrangeMode = "custom";
    const sel = document.getElementById("endAttachmentArrangeMode");
    if (sel) sel.value = "custom";
    renderEndorseAttachmentList();
}

function removeEndorseAttachment(index) {
    if (index < 0 || index >= endorseAttachmentsList.length) return;
    endorseAttachmentsList.splice(index, 1);
    renderEndorseAttachmentList();
}

function clearAllEndorseAttachments() {
    endorseAttachmentsList = [];
    const fileInput = document.getElementById("endAttachmentFiles");
    if (fileInput) fileInput.value = "";
    renderEndorseAttachmentList();
    showToast("All attached files removed.");
}

function onEndorseRowDragStart(e, idx) {
    draggedEndorseAttachmentIndex = idx;
    if (e.dataTransfer) {
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", String(idx));
    }
}

function onEndorseRowDragOver(e) {
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = "move";
}

function onEndorseRowDrop(e, targetIdx) {
    e.preventDefault();
    e.stopPropagation();
    if (draggedEndorseAttachmentIndex === null || draggedEndorseAttachmentIndex === targetIdx) {
        draggedEndorseAttachmentIndex = null;
        return;
    }
    const [moved] = endorseAttachmentsList.splice(draggedEndorseAttachmentIndex, 1);
    endorseAttachmentsList.splice(targetIdx, 0, moved);
    draggedEndorseAttachmentIndex = null;

    endorseAttachmentArrangeMode = "custom";
    const sel = document.getElementById("endAttachmentArrangeMode");
    if (sel) sel.value = "custom";
    renderEndorseAttachmentList();
}

function onEndorseRowDragEnd() {
    draggedEndorseAttachmentIndex = null;
}

function renderEndorseAttachmentList() {
    const container = document.getElementById("endAttachmentListContainer");
    const arrangeBar = document.getElementById("endAttachmentArrangeBar");
    const clearBtn = document.getElementById("btnClearEndorseAttachments");
    const arrangeSel = document.getElementById("endAttachmentArrangeMode");
    const layoutSel = document.getElementById("endAttachmentLayoutMode");

    if (arrangeSel) arrangeSel.value = endorseAttachmentArrangeMode || "custom";
    if (layoutSel) layoutSel.value = endorseAttachmentLayoutMode || "page_per_item";

    const hasFiles = endorseAttachmentsList.length > 0;
    if (arrangeBar) arrangeBar.classList.toggle("hidden", !hasFiles);
    if (clearBtn) clearBtn.classList.toggle("hidden", !hasFiles);

    if (!container) return;
    if (!hasFiles) {
        container.innerHTML = `<p class="text-[10.5px] text-slate-500 italic text-center py-1">No files attached yet. You can attach unlimited Images and PDFs.</p>`;
        return;
    }

    container.innerHTML = endorseAttachmentsList.map((item, idx) => {
        const isFirst = idx === 0;
        const isLast = idx === endorseAttachmentsList.length - 1;
        const thumbHtml = item.kind === "pdf"
            ? `<div class="w-10 h-10 rounded bg-rose-950 border border-rose-700/70 flex flex-col items-center justify-center shrink-0 text-rose-300 font-extrabold text-[9px]"><span>📕</span><span>PDF</span></div>`
            : (item.previewUrl
                ? `<img src="${item.previewUrl}" class="w-10 h-10 rounded object-cover border border-slate-700 bg-white shrink-0" />`
                : `<div class="w-10 h-10 rounded bg-sky-950 border border-sky-700/70 flex items-center justify-center shrink-0 text-sky-300 font-extrabold text-xs">🖼️</div>`);

        const metaText = item.kind === "pdf"
            ? `PDF Document${item.pageCount ? ` • ${item.pageCount} page${item.pageCount > 1 ? "s" : ""}` : ""} • ${formatReadableFileSize(item.size)}`
            : `Image • ${formatReadableFileSize(item.size)}`;

        return `
            <div draggable="true" ondragstart="onEndorseRowDragStart(event, ${idx})" ondragover="onEndorseRowDragOver(event)" ondrop="onEndorseRowDrop(event, ${idx})" ondragend="onEndorseRowDragEnd()" class="flex items-center justify-between gap-2 bg-slate-900 hover:bg-slate-800/80 border border-slate-800 rounded-lg p-2 cursor-grab active:cursor-grabbing transition">
                <div class="flex items-center gap-2 min-w-0 flex-1">
                    <span class="text-slate-500 font-mono text-xs select-none" title="Drag to reorder">⠿</span>
                    <span class="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-mono font-extrabold text-[10px] shrink-0">#${idx + 1}</span>
                    ${thumbHtml}
                    <div class="min-w-0 flex-1">
                        <p class="text-[11px] font-bold text-white truncate" title="${escapeHtml(item.name)}">${escapeHtml(item.name)}</p>
                        <p class="text-[10px] text-slate-400 font-mono">${escapeHtml(metaText)}</p>
                    </div>
                </div>
                <div class="flex items-center gap-1 shrink-0">
                    <button type="button" onclick="moveEndorseAttachment(${idx}, 'top')" ${isFirst ? "disabled" : ""} title="Move to Top" class="px-1.5 py-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-35 text-slate-200 rounded text-[10px] font-bold">⤒</button>
                    <button type="button" onclick="moveEndorseAttachment(${idx}, 'up')" ${isFirst ? "disabled" : ""} title="Move Up" class="px-1.5 py-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-35 text-slate-200 rounded text-[10px] font-bold">↑</button>
                    <button type="button" onclick="moveEndorseAttachment(${idx}, 'down')" ${isLast ? "disabled" : ""} title="Move Down" class="px-1.5 py-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-35 text-slate-200 rounded text-[10px] font-bold">↓</button>
                    <button type="button" onclick="moveEndorseAttachment(${idx}, 'bottom')" ${isLast ? "disabled" : ""} title="Move to Bottom" class="px-1.5 py-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-35 text-slate-200 rounded text-[10px] font-bold">⤓</button>
                    <button type="button" onclick="removeEndorseAttachment(${idx})" title="Remove File" class="px-2 py-1 bg-rose-950 hover:bg-rose-900 text-rose-300 rounded text-[10px] font-bold ml-0.5">✕</button>
                </div>
            </div>
        `;
    }).join("");
}

function captureEndorseModalDraft() {
    const sigChecked = document.querySelector('input[name="sigType"]:checked');
    lastEndorseModalDraft = {
        ticketIndex: document.getElementById('endorseTicketIndex')?.value ?? '',
        officeSelect: document.getElementById('endOfficeSelect')?.value ?? '',
        chiefNameSelect: document.getElementById('endChiefNameSelect')?.value ?? '',
        chiefName: document.getElementById('endChiefName')?.value ?? '',
        position: document.getElementById('endPosition')?.value ?? '',
        agencyName: document.getElementById('endAgencyName')?.value ?? '',
        emailAddress: document.getElementById('endEmailAddress')?.value ?? '',
        officeAddress: document.getElementById('endOfficeAddress')?.value ?? '',
        complainantName: document.getElementById('endComplainantName')?.value ?? '',
        complainantEmail: document.getElementById('endComplainantEmail')?.value ?? '',
        rdmpaoEmail: document.getElementById('endRdmpaoEmail')?.value ?? '',
        fontFamily: document.getElementById('endFontFamily')?.value ?? 'font-sans',
        briefDescription: document.getElementById('endBriefDescription')?.value ?? '',
        sigType: sigChecked ? sigChecked.value : 'esign',
        attachments: [...endorseAttachmentsList],
        arrangeMode: endorseAttachmentArrangeMode,
        layoutMode: endorseAttachmentLayoutMode
    };
}

function restoreEndorseModalDraft(draft) {
    if (!draft) return;
    const sel = document.getElementById('endOfficeSelect');
    if (sel) {
        if (sel.options.length <= 1) {
            sel.innerHTML = '<option value="">-- Select LTO Region / Office --</option>';
            AppState.directory.forEach((d, idx) => {
                sel.innerHTML += `<option value="${idx}">${escapeHtml(d.office)} (${escapeHtml(d.code)})</option>`;
            });
        }
        sel.value = draft.officeSelect || '';
        if (draft.officeSelect !== '' && AppState.directory[parseInt(draft.officeSelect, 10)]) {
            populateEndorseChiefDropdown(parseInt(draft.officeSelect, 10), draft.chiefName || '');
            const chiefSel = document.getElementById('endChiefNameSelect');
            if (chiefSel && draft.chiefNameSelect !== '') {
                chiefSel.value = draft.chiefNameSelect;
            }
        }
    }
    document.getElementById('endorseTicketIndex').value = draft.ticketIndex ?? '';
    document.getElementById('endChiefName').value = draft.chiefName || '';
    document.getElementById('endPosition').value = draft.position || '';
    document.getElementById('endAgencyName').value = draft.agencyName || '';
    document.getElementById('endEmailAddress').value = draft.emailAddress || '';
    document.getElementById('endOfficeAddress').value = draft.officeAddress || '';
    document.getElementById('endComplainantName').value = draft.complainantName || '';
    document.getElementById('endComplainantEmail').value = draft.complainantEmail || '';
    document.getElementById('endRdmpaoEmail').value = draft.rdmpaoEmail || '';
    if (document.getElementById('endFontFamily')) {
        document.getElementById('endFontFamily').value = draft.fontFamily || 'font-sans';
    }
    document.getElementById('endBriefDescription').value = draft.briefDescription || '';
    const sigRadio = document.querySelector(`input[name="sigType"][value="${draft.sigType || 'esign'}"]`);
    if (sigRadio) sigRadio.checked = true;

    endorseAttachmentsList = Array.isArray(draft.attachments) ? [...draft.attachments] : [];
    endorseAttachmentArrangeMode = draft.arrangeMode || "custom";
    endorseAttachmentLayoutMode = draft.layoutMode || "page_per_item";
    renderEndorseAttachmentList();
}

function openEndorseModal(index) {
    ensureDirectoryOfficialsInitialized();
    const ticket = AppState.tickets[index];
    if (!ticket) return;
    if (!canUserDeleteTicket(ticket)) {
        showSystemAlert("Access Restricted", "You can only delete your own ticket logs. Only Super Admin and AdminTL can delete logs of other admins.", "🔒");
        return;
    }
    document.getElementById('endorseTicketIndex').value = index;

    const sel = document.getElementById('endOfficeSelect');
    if (sel) {
        sel.innerHTML = '<option value="">-- Select LTO Region / Office --</option>';
        AppState.directory.forEach((d, idx) => {
            sel.innerHTML += `<option value="${idx}">${escapeHtml(d.office)} (${escapeHtml(d.code)})</option>`;
        });
    }

    if (lastEndorseModalDraft && String(lastEndorseModalDraft.ticketIndex) === String(index)) {
        restoreEndorseModalDraft(lastEndorseModalDraft);
        document.getElementById('endorseModal').style.display = 'flex';
        return;
    }

    lastEndorseModalDraft = null;
    endorseAttachmentsList = [];
    endorseAttachmentArrangeMode = "custom";
    endorseAttachmentLayoutMode = "page_per_item";

    const extra = ticket.extraData || {};
    document.getElementById('endChiefName').value = "";
    document.getElementById('endPosition').value = "";
    document.getElementById('endAgencyName').value = "";
    document.getElementById('endEmailAddress').value = "";
    document.getElementById('endOfficeAddress').value = "";
    document.getElementById('endComplainantName').value = ticket.complainantName || "";
    document.getElementById('endComplainantEmail').value = extra.complainantEmail || ticket.complainantEmail || "";
    document.getElementById('endRdmpaoEmail').value = "";
    document.getElementById('endBriefDescription').value = "";
    const fileInput = document.getElementById('endAttachmentFiles');
    if (fileInput) fileInput.value = "";
    renderEndorseAttachmentList();

    const chiefSel = document.getElementById('endChiefNameSelect');
    if (chiefSel) chiefSel.innerHTML = '<option value="">-- Select Region First --</option>';

    document.getElementById('endorseModal').style.display = 'flex';
}

function onRegionDirectorySelect(val) {
    const chiefSel = document.getElementById('endChiefNameSelect');
    if (val === "" || val === undefined) {
        if (chiefSel) chiefSel.innerHTML = '<option value="">-- Select Region First --</option>';
        document.getElementById('endChiefName').value = "";
        document.getElementById('endPosition').value = "";
        document.getElementById('endAgencyName').value = "";
        document.getElementById('endEmailAddress').value = "";
        document.getElementById('endOfficeAddress').value = "";
        document.getElementById('endRdmpaoEmail').value = "";
        return;
    }
    const regionIdx = parseInt(val, 10);
    const entry = AppState.directory[regionIdx];
    if (entry) {
        document.getElementById('endChiefName').value = entry.chief || "";
        document.getElementById('endPosition').value = entry.position || "";
        document.getElementById('endAgencyName').value = entry.office || "Land Transportation Office";
        document.getElementById('endEmailAddress').value = entry.email || "";
        document.getElementById('endOfficeAddress').value = entry.address || "";
        document.getElementById('endRdmpaoEmail').value = entry.rdmpaoEmail || entry.email || "";
        populateEndorseChiefDropdown(regionIdx, entry.chief || "");
    }
}

function closeEndorseModal(clearDraft = false) {
    if (clearDraft) {
        lastEndorseModalDraft = null;
        endorseAttachmentsList = [];
        endorsePreviewPages = [];
    } else {
        captureEndorseModalDraft();
    }
    document.getElementById('endorseModal').style.display = 'none';
}

function closeEndorsePreviewModal() {
    setEndorsementEditState(false);
    document.getElementById('endorsePreviewModal').style.display = 'none';
    document.body.classList.remove('printing-endorse');
    const endorseModal = document.getElementById('endorseModal');
    if (endorseModal) {
        if (lastEndorseModalDraft) {
            restoreEndorseModalDraft(lastEndorseModalDraft);
        }
        endorseModal.style.display = 'flex';
    }
}

function addWorkingDays(startDateStr, daysToAdd) {
    let dateObj = new Date(mmddyyyyToISO(startDateStr));
    if (isNaN(dateObj.getTime())) dateObj = new Date();
    let added = 0;
    while (added < daysToAdd) {
        dateObj.setDate(dateObj.getDate() + 1);
        let isoStr = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;
        if (dateObj.getDay() !== 0 && dateObj.getDay() !== 6 && !AppState.toggledOffDates.includes(isoStr)) added++;
    }
    const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    return `${["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][dateObj.getDay()]}, ${String(dateObj.getDate()).padStart(2, '0')} ${months[dateObj.getMonth()]} ${dateObj.getFullYear()}`;
}

function buildTicketBriefDescriptionHtml(ticket, modalDesc) {
    const cleanText = String(modalDesc || "").trim();
    if (!cleanText) return "";
    const lower = cleanText.toLowerCase();
    return (lower.startsWith("against ") || lower.startsWith("regarding "))
        ? escapeHtml(cleanText)
        : `against ${escapeHtml(cleanText)}`;
}

function buildTicketForwardedClauseHtml(ticket) {
    const extra = ticket.extraData || {};
    const fwdTo = String(extra.forwardedTo || ticket.forwardedTo || "").trim();
    const fwdEmail = String(extra.forwardedEmail || ticket.forwardedEmail || "").trim();
    if (!fwdTo && !fwdEmail) return "";
    const emailPart = fwdEmail ? ` (<span class="text-blue-700 underline">${escapeHtml(fwdEmail)}</span>)` : "";
    const labelPart = fwdTo ? `“<strong>${escapeHtml(fwdTo)}</strong>”` : "";
    return ` and subsequently forwarded to ${labelPart}${emailPart}`;
}

function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (evt) => resolve(evt.target.result);
        reader.onerror = () => reject(new Error("Failed to read file"));
        reader.readAsDataURL(file);
    });
}

async function renderPdfFileToPreviewPages(attItem) {
    const pagesOut = [];
    if (window.pdfjsLib && attItem.file) {
        try {
            const arrayBuffer = await attItem.file.arrayBuffer();
            const pdfDoc = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            const total = pdfDoc.numPages || 1;
            attItem.pageCount = total;

            for (let p = 1; p <= total; p++) {
                const page = await pdfDoc.getPage(p);
                const viewport = page.getViewport({ scale: 1.85 });
                const canvas = document.createElement("canvas");
                canvas.width = Math.round(viewport.width);
                canvas.height = Math.round(viewport.height);
                const ctx = canvas.getContext("2d");
                ctx.fillStyle = "#ffffff";
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                await page.render({ canvasContext: ctx, viewport: viewport }).promise;
                const dataUrl = canvas.toDataURL("image/jpeg", 0.92);

                pagesOut.push({
                    pageId: `${attItem.id}_p${p}`,
                    sourceFileName: attItem.name,
                    sourceType: "pdf",
                    pdfPageNum: p,
                    pdfTotalPages: total,
                    label: total > 1
                        ? `Attachment: ${attItem.name} (Page ${p} of ${total})`
                        : `Attachment: ${attItem.name}`,
                    imageUrl: dataUrl,
                    widthPct: 100,
                    isFallbackPdf: false
                });
            }
            return pagesOut;
        } catch (err) {
            console.warn("PDF.js page rendering fallback triggered:", err);
        }
    }

    const blobUrl = URL.createObjectURL(attItem.file);
    pagesOut.push({
        pageId: `${attItem.id}_fallback`,
        sourceFileName: attItem.name,
        sourceType: "pdf",
        pdfPageNum: 1,
        pdfTotalPages: 1,
        label: `Attachment: ${attItem.name}`,
        imageUrl: blobUrl,
        widthPct: 100,
        isFallbackPdf: true
    });
    return pagesOut;
}

async function buildEndorsePreviewPagesFromAttachments(attachments) {
    const pages = [];
    for (const item of attachments) {
        if (item.kind === "image") {
            const dataUrl = item.previewUrl || await readFileAsDataUrl(item.file);
            pages.push({
                pageId: `${item.id}_img`,
                sourceFileName: item.name,
                sourceType: "image",
                pdfPageNum: null,
                pdfTotalPages: null,
                label: `Attachment: ${item.name}`,
                imageUrl: dataUrl,
                widthPct: 100,
                isFallbackPdf: false
            });
        } else if (item.kind === "pdf") {
            const pdfPages = await renderPdfFileToPreviewPages(item);
            pages.push(...pdfPages);
        }
    }
    return pages;
}

function toggleEndorseAttachmentLabels() {
    endorseShowAttachmentLabels = !endorseShowAttachmentLabels;
    const btn = document.getElementById("btnToggleEndorseAttachmentLabels");
    if (btn) {
        btn.textContent = endorseShowAttachmentLabels ? "🏷️ File Labels: ON" : "🏷️ File Labels: OFF";
    }
    renderEndorseAttachmentsPreviewSection();
}

function moveEndorsePreviewPage(idx, delta) {
    const newIdx = idx + delta;
    if (idx < 0 || idx >= endorsePreviewPages.length || newIdx < 0 || newIdx >= endorsePreviewPages.length) return;
    const [moved] = endorsePreviewPages.splice(idx, 1);
    endorsePreviewPages.splice(newIdx, 0, moved);
    renderEndorseAttachmentsPreviewSection();
}

function setEndorsePreviewPageWidth(idx, widthVal) {
    if (!endorsePreviewPages[idx]) return;
    endorsePreviewPages[idx].widthPct = parseInt(widthVal, 10) || 100;
    renderEndorseAttachmentsPreviewSection();
}

function removeEndorsePreviewPage(idx) {
    if (idx < 0 || idx >= endorsePreviewPages.length) return;
    endorsePreviewPages.splice(idx, 1);
    renderEndorseAttachmentsPreviewSection();
    showToast("Attachment page removed from preview.");
}

function rotateEndorsePreviewPage(idx) {
    const pageItem = endorsePreviewPages[idx];
    if (!pageItem || pageItem.isFallbackPdf || !pageItem.imageUrl) return;

    const img = new Image();
    img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.height;
        canvas.height = img.width;
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate(Math.PI / 2);
        ctx.drawImage(img, -img.width / 2, -img.height / 2);
        pageItem.imageUrl = canvas.toDataURL("image/jpeg", 0.92);
        renderEndorseAttachmentsPreviewSection();
        showToast("Rotated 90° clockwise.");
    };
    img.src = pageItem.imageUrl;
}

function renderEndorseAttachmentsPreviewSection() {
    const container = document.getElementById("endorseAttachmentsPreviewSection");
    const labelToggleBtn = document.getElementById("btnToggleEndorseAttachmentLabels");
    if (labelToggleBtn) {
        labelToggleBtn.classList.toggle("hidden", endorsePreviewPages.length === 0);
        labelToggleBtn.textContent = endorseShowAttachmentLabels ? "🏷️ File Labels: ON" : "🏷️ File Labels: OFF";
    }
    if (!container) return;

    if (!endorsePreviewPages || endorsePreviewPages.length === 0) {
        container.innerHTML = "";
        return;
    }

    const usePageBreaks = endorseAttachmentLayoutMode === "page_per_item";

    container.innerHTML = endorsePreviewPages.map((item, idx) => {
        const isFirst = idx === 0;
        const isLast = idx === endorsePreviewPages.length - 1;
        const wrapperClass = usePageBreaks
            ? "endorse-attachment-page-break space-y-2"
            : "mt-5 pt-4 border-t border-slate-200 space-y-2 page-break-inside-avoid";

        const badgeText = item.sourceType === "pdf"
            ? `Attachment #${idx + 1} • PDF${item.pdfTotalPages > 1 ? ` (Page ${item.pdfPageNum} of ${item.pdfTotalPages})` : ""}`
            : `Attachment #${idx + 1} • IMAGE`;

        const labelHtml = endorseShowAttachmentLabels
            ? `<p class="text-[11px] font-bold text-slate-700 mb-1.5">${escapeHtml(item.label)}</p>`
            : "";

        const mediaHtml = item.isFallbackPdf
            ? `<iframe src="${item.imageUrl}" class="w-full h-[760px] border border-slate-300 rounded"></iframe>`
            : `<img src="${item.imageUrl}" style="width: ${item.widthPct}%; max-width: 100%;" class="mx-auto block object-contain rounded shadow-sm border border-slate-200" />`;

        return `
            <div class="${wrapperClass}">
                <div contenteditable="false" class="no-print flex flex-wrap items-center justify-between gap-2 bg-slate-100 border border-slate-300 rounded-lg px-3 py-1.5 text-[11px] text-slate-800 select-none">
                    <div class="flex items-center gap-2 min-w-0">
                        <span class="px-2 py-0.5 rounded bg-slate-800 text-white font-mono font-bold text-[10px]">${escapeHtml(badgeText)}</span>
                        <span class="font-semibold truncate max-w-[220px]" title="${escapeHtml(item.sourceFileName)}">${escapeHtml(item.sourceFileName)}</span>
                    </div>
                    <div class="flex items-center gap-1.5 flex-wrap">
                        <button type="button" onclick="moveEndorsePreviewPage(${idx}, -1)" ${isFirst ? "disabled" : ""} title="Move Up" class="px-2 py-1 bg-white hover:bg-slate-200 disabled:opacity-40 border border-slate-300 rounded font-bold text-[10px]">↑ Up</button>
                        <button type="button" onclick="moveEndorsePreviewPage(${idx}, 1)" ${isLast ? "disabled" : ""} title="Move Down" class="px-2 py-1 bg-white hover:bg-slate-200 disabled:opacity-40 border border-slate-300 rounded font-bold text-[10px]">↓ Down</button>
                        ${!item.isFallbackPdf ? `<button type="button" onclick="rotateEndorsePreviewPage(${idx})" title="Rotate 90° Clockwise" class="px-2 py-1 bg-white hover:bg-slate-200 border border-slate-300 rounded font-bold text-[10px]">↻ Rotate</button>` : ""}
                        ${!item.isFallbackPdf ? `
                            <select onchange="setEndorsePreviewPageWidth(${idx}, this.value)" title="Adjust Image Width" class="bg-white border border-slate-300 rounded px-1.5 py-1 text-[10px] font-bold">
                                <option value="100" ${item.widthPct === 100 ? "selected" : ""}>100% Width</option>
                                <option value="85" ${item.widthPct === 85 ? "selected" : ""}>85% Width</option>
                                <option value="70" ${item.widthPct === 70 ? "selected" : ""}>70% Width</option>
                            </select>
                        ` : ""}
                        <button type="button" onclick="removeEndorsePreviewPage(${idx})" title="Remove Page / Attachment" class="px-2 py-1 bg-rose-100 hover:bg-rose-200 text-rose-800 border border-rose-300 rounded font-bold text-[10px]">🗑️ Remove</button>
                    </div>
                </div>
                <div class="endorse-attachment-item-card border border-slate-200 rounded-lg p-3 bg-slate-50/40">
                    ${labelHtml}
                    ${mediaHtml}
                </div>
            </div>
        `;
    }).join("");
}

async function generateEndorsementLetter(e) {
    e.preventDefault();
    const idx = document.getElementById('endorseTicketIndex').value;
    const ticket = AppState.tickets[idx];
    if (!ticket) return;

    const previewBtn = document.getElementById('btnPreviewEndorseLetter');
    const origBtnText = previewBtn ? previewBtn.textContent : "Preview Letter";
    if (previewBtn) {
        previewBtn.disabled = true;
        previewBtn.textContent = "⏳ Rendering Attachments...";
    }

    try {
        const chief = document.getElementById('endChiefName').value.trim();
        const pos = document.getElementById('endPosition').value.trim();
        const agency = document.getElementById('endAgencyName').value.trim();
        const email = document.getElementById('endEmailAddress').value.trim();
        const regionIdxVal = document.getElementById('endOfficeSelect').value;
        const selectedRegionEntry = regionIdxVal !== "" ? AppState.directory[parseInt(regionIdxVal, 10)] : null;
        const regionLabel = selectedRegionEntry ? selectedRegionEntry.office : (agency || "Regional Office");
        const address = document.getElementById('endOfficeAddress').value.trim();
        const compName = document.getElementById('endComplainantName').value.trim() || ticket.complainantName || "Complainant";
        const complainantEmail = document.getElementById('endComplainantEmail')?.value.trim() || "";
        const rdmpaoEmail = document.getElementById('endRdmpaoEmail')?.value.trim() || email;
        const desc = document.getElementById('endBriefDescription').value.trim();
        const font = document.getElementById('endFontFamily').value;
        const sigType = document.querySelector('input[name="sigType"]:checked').value;

        captureEndorseModalDraft();

        endorsePreviewPages = await buildEndorsePreviewPagesFromAttachments(endorseAttachmentsList);

        const formCfg = getEndorsementFormConfig();
        const todayStr = formatDayMonthYear(new Date());
        const baseReceivedDate = ticket.dateReceived || getTodayMMDDYYYY();
        const receivedFormatted = formatDayMonthYear(baseReceivedDate);
        const dueDate = addWorkingDays(baseReceivedDate, 20);
        const refNo = ticket.referralNo || "CPAO-REF-01";
        const chiefLastName = chief.trim().split(/\s+/).filter(Boolean).pop() || chief;
        const subjectTerm = resolveTicketSubjectTerm(ticket);

        const cfg = AppState.settings.reportConfig || {};
        const sigName = formCfg.sigName || cfg.notedName || 'MARY MAY M. JACOB';
        const sigTitle = formCfg.sigTitle || cfg.notedDesig || 'Head, LTO Strategic Communications';
        const sigOffice = formCfg.sigOffice || 'Central – Public Assistance Office';

        let signatureBlock = sigType === 'esign'
            ? `<div class="font-bold text-xs text-slate-800 pl-6 mb-1">[SIGNED]</div><p class="font-extrabold uppercase text-xs text-slate-900">${escapeHtml(sigName)}</p><p class="text-slate-800 text-xs">${escapeHtml(sigTitle)}</p><p class="text-slate-700 text-xs">${escapeHtml(sigOffice)}</p>`
            : `<div class="h-10"></div><p class="font-extrabold uppercase text-xs text-slate-900">${escapeHtml(sigName)}</p><p class="text-slate-800 text-xs">${escapeHtml(sigTitle)}</p><p class="text-slate-700 text-xs">${escapeHtml(sigOffice)}</p>`;

        const includeShowCause = isTrafficViolationConcern(ticket);

        const dataMap = {
            todayDate: todayStr,
            dateReceivedFormatted: receivedFormatted,
            chiefName: escapeHtml(chief),
            chiefLastName: escapeHtml(chiefLastName),
            chiefPosition: escapeHtml(pos),
            agencyName: escapeHtml(agency),
            officeName: escapeHtml(regionLabel),
            officeAddress: escapeHtml(address),
            emailAddress: escapeHtml(email),
            rdmpaoEmail: escapeHtml(rdmpaoEmail),
            complainantName: escapeHtml(compName),
            complainantEmail: escapeHtml(complainantEmail),
            platform: escapeHtml(ticket.platform || 'FACEBOOK'),
            ticketSubjectTerm: escapeHtml(subjectTerm),
            forwardedClause: buildTicketForwardedClauseHtml(ticket),
            briefDescription: buildTicketBriefDescriptionHtml(ticket, desc),
            dueDate: dueDate,
            ticketRefNo: escapeHtml(refNo),
            includeShowCause: includeShowCause,
            signatureBlock: signatureBlock,
            attachmentHtml: ""
        };

        const letterBodyHtml = renderStandardEndorsementLetterHtml(dataMap, formCfg);

        const printArea = document.getElementById('endorseLetterPrintArea');
        printArea.className = `p-8 bg-white text-slate-900 text-xs sm:text-sm space-y-5 outline-none ${font}`;
        printArea.innerHTML = `
            <div id="endorseLetterBodySection">${letterBodyHtml}</div>
            <div id="endorseAttachmentsPreviewSection"></div>
        `;
        renderEndorseAttachmentsPreviewSection();
        setEndorsementEditState(false);

        closeEndorseModal(false);
        document.body.classList.add('printing-endorse');
        document.getElementById('endorsePreviewModal').style.display = 'flex';
    } finally {
        if (previewBtn) {
            previewBtn.disabled = false;
            previewBtn.textContent = origBtnText;
        }
    }
}

function printEndorsementLetter() {
    if (isEndorseLetterEditing) {
        setEndorsementEditState(false);
    }
    window.print();
}

function ticketMatchesSearchTerm(ticket, searchLower) {
    if (!searchLower) return true;
    const searchableFields = [
        ticket.referralNo,
        ticket.complainantName,
        ticket.ticketDetails,
        ticket.responseDetails,
        ticket.remarks,
        ticket.category,
        ticket.platform,
        ticket.adminNo,
        ticket.actionTaken,
        ticket.status,
        ticket.ticketType
    ];
    if (searchableFields.some(v => v && String(v).toLowerCase().includes(searchLower))) {
        return true;
    }
    const extra = ticket.extraData;
    if (extra && typeof extra === "object") {
        return Object.values(extra).some(ev => ev && typeof ev !== "object" && String(ev).toLowerCase().includes(searchLower));
    }
    return false;
}

function ticketMatchesAdminSearch(ticket, searchLower) {
    const cleanAdmin = String(ticket.adminNo || '').toLowerCase().trim();
    const digitsOnly = cleanAdmin.replace(/\D/g, '');
    const qDigits = searchLower.replace(/\D/g, '');
    if (cleanAdmin.includes(searchLower)) return true;
    if (qDigits && digitsOnly && qDigits === digitsOnly && (searchLower.includes('admin') || /^\d+$/.test(searchLower.trim()))) {
        return true;
    }
    return false;
}

function isTicketOwnedByCurrentUser(ticket) {
    const tAdminRaw = String(ticket.adminNo || '').trim().toLowerCase();
    const uAdminRaw = String(currentUser.adminNo || '').trim().toLowerCase();
    const uUsername = String(currentUser.username || '').trim().toLowerCase();
    const uName = String(currentUser.name || '').trim().toLowerCase();

    const tDigits = tAdminRaw.replace(/\D/g, '');
    const uDigits = (uAdminRaw || uUsername).replace(/\D/g, '');

    if (uDigits && tDigits && uDigits === tDigits) {
        return true;
    }
    if (uAdminRaw && tAdminRaw === uAdminRaw) {
        return true;
    }
    if (uUsername && (tAdminRaw === uUsername || tAdminRaw.includes(uUsername))) {
        return true;
    }
    if (uName && tAdminRaw === uName) {
        return true;
    }
    return false;
}

function getFilteredTickets() {
    const search = (document.getElementById('searchInput')?.value || '').toLowerCase().trim();
    const platform = document.getElementById('filterPlatform')?.value || '';
    const status = document.getElementById('filterStatus')?.value || '';
    const filterDateISO = document.getElementById('filterDate')?.value || '';
    const filterDateMDY = filterDateISO ? isoToMMDDYYYY(filterDateISO) : '';
    const isMyLogsOnly = document.getElementById('superadminViewScope')?.value === 'my';
    const privilegedAdminSearch = isSuperAdmin() || isAdminTL();

    return AppState.tickets.filter(t => {
        if (filterDateMDY && t.dateReceived !== filterDateMDY) return false;
        if (platform && t.platform.toUpperCase() !== platform.toUpperCase()) return false;
        if (status && t.status.toLowerCase() !== status.toLowerCase()) return false;

        if (search) {
            if (privilegedAdminSearch && ticketMatchesAdminSearch(t, search)) {
                return true;
            }
            return ticketMatchesSearchTerm(t, search);
        }

        if (isMyLogsOnly && !isTicketOwnedByCurrentUser(t)) return false;
        return true;
    });
}

function updateKPIs(filteredList = null) {
    const list = filteredList || getFilteredTickets();
    const total = list.length;
    const closed = list.filter(t => t.status && t.status.toLowerCase() === 'closed').length;
    const pending = total - closed;
    const rate = total > 0 ? Math.round((closed / total) * 100) : 0;

    const filterDateISO = document.getElementById('filterDate')?.value || '';
    const cols = getColumnLabelsConfig();
    const recLabel = (cols.received && cols.received.toLowerCase() !== 'received') ? `${cols.received} Logs` : "Today's Logs";
    document.getElementById('kpiTotalLabel').textContent = filterDateISO === getTodayISO() ? recLabel : (filterDateISO ? `Logs (${isoToMMDDYYYY(filterDateISO)})` : `All ${cols.received || 'Registered'} Logs`);
    document.getElementById('kpiTotal').textContent = total;
    document.getElementById('kpiClosed').textContent = closed;
    document.getElementById('kpiPending').textContent = pending;
    document.getElementById('kpiRate').textContent = `${rate}%`;
}

function renderTable() {
    const tbody = document.getElementById('logTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';
    const filtered = getFilteredTickets();

    const btnDelLogs = document.getElementById('btnDeleteDateLogs');
    if (btnDelLogs) btnDelLogs.style.display = canUserDeleteLogs() ? 'inline-block' : 'none';

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="14" class="text-center py-8 text-slate-400 text-xs">No log entries found. Click <strong>+ Log New</strong> to add an entry.</td></tr>`;
        updateKPIs(filtered);
        return;
    }

    filtered.forEach((ticket, idx) => {
        const origIndex = AppState.tickets.indexOf(ticket);
        const tr = document.createElement('tr');
        const isClosed = ticket.status && ticket.status.toLowerCase() === 'closed';
        const isPending = !isClosed;

        if (isPending) {
            tr.className = 'row-pending';
            tr.style.backgroundColor = '#b45309';
            tr.style.color = '#fffbeb';
        } else if (currentUser.logColor && currentUser.logColor !== 'Default') {
            tr.style.backgroundColor = currentUser.logColor;
            tr.style.color = '#ffffff';
        } else {
            tr.className = 'row-terracotta';
        }

        const expired24h = isTicket24HourExpired(ticket);
        const autoCloseBtnHtml = expired24h
            ? `<button type="button" onclick="autoCloseTicketFromReminder(${origIndex})" title="Close Ticket (24h Timer Expired)" class="px-2 py-1 bg-emerald-700 hover:bg-emerald-600 text-white rounded font-bold text-[10px] shadow transition">✓ Close</button>`
            : '';

        const canEditRow = canUserEditTicket(ticket);
        const canDeleteRow = canUserDeleteTicket(ticket);
        const editBtnHtml = canEditRow
            ? `${editBtnHtml}`
            : '';
        const deleteBtnHtml = canDeleteRow
            ? `${deleteBtnHtml}`
            : '';
        let actionButtons = `
            <div class="flex items-center justify-center gap-1.5 flex-wrap">
                ${autoCloseBtnHtml}
                <button type="button" onclick="openEndorseModal(${origIndex})" title="Endorse Letter" class="px-2 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded font-bold text-[10px] shadow transition">📤 Endorse</button>
                <button type="button" onclick="openTicketModal(${origIndex})" title="Edit" class="p-1.5 bg-black/20 hover:bg-black/40 rounded transition">✏️</button>
                <button type="button" onclick="deleteTicket(${origIndex})" title="Delete" class="p-1.5 bg-black/20 hover:bg-black/40 rounded transition">🗑️</button>
            </div>
        `;

        tr.innerHTML = `
            <td class="text-center font-mono font-semibold opacity-80 text-[11px] whitespace-nowrap">${idx + 1}</td>
            <td class="text-center whitespace-nowrap">${actionButtons}</td>
            <td class="font-bold whitespace-nowrap">${escapeHtml(ticket.adminNo || currentUser.adminNo || '')}</td>
            <td><span class="chip-pill">${escapeHtml(ticket.platform)}</span></td>
            <td class="font-mono font-bold text-amber-200 whitespace-nowrap">${escapeHtml(ticket.referralNo || '—')}</td>
            <td class="font-mono text-[11px] whitespace-nowrap">${escapeHtml(ticket.dateReceived || '—')}</td>
            <td><span class="chip-pill">${escapeHtml(ticket.category)}</span></td>
            <td><div class="cell-clamp-2">${escapeHtml(ticket.ticketType || '—')}</div></td>
            <td class="font-semibold"><div class="cell-clamp-2">${escapeHtml(ticket.complainantName || '—')}</div></td>
            <td><div class="cell-clamp-2">${escapeHtml(ticket.ticketDetails || '—')}</div></td>
            <td><div class="cell-clamp-2">${escapeHtml(ticket.responseDetails || '—')}</div></td>
            <td>
                <div class="cell-clamp-2">${escapeHtml(ticket.actionTaken || '—')}</div>
                ${(ticket.is24Hours || (ticket.extraData && ticket.extraData.is24Hours)) ? '<span class="inline-block mt-1 px-2 py-0.5 rounded bg-sky-950 text-sky-300 border border-sky-500/50 text-[9px] font-extrabold uppercase tracking-wider">⏱️ 24 Hours</span>' : ''}
                ${expired24h ? '<span class="badge-24h-overdue inline-block mt-1 px-2 py-0.5 rounded bg-rose-950 text-rose-200 border border-rose-500 text-[9px] font-extrabold uppercase tracking-wider">⚠️ 24H EXPIRED — CHECK CLIENT</span>' : ''}
            </td>
            <td class="text-center whitespace-nowrap"><span class="inline-block px-2.5 py-0.5 rounded text-[10px] font-extrabold uppercase ${isClosed ? 'bg-emerald-800 text-white' : 'bg-amber-950 text-amber-200 border border-amber-400'}">${escapeHtml(ticket.status || 'Closed')}</span></td>
            <td class="font-bold text-[11px]"><div class="cell-clamp-2">${escapeHtml(ticket.remarks || '')}</div></td>
        `;
        tbody.appendChild(tr);
    });
    updateKPIs(filtered);
    render24HourReminderBanner();
}

function resetFiltersToToday() {
    document.getElementById('searchInput').value = '';
    document.getElementById('filterPlatform').value = currentUser.defaultPortal || '';
    document.getElementById('filterStatus').value = '';
    setSystemDateInputValue('filterDate', getTodayISO());
    applyDefaultViewScopeForUser();
    renderTable();
}

function openDeleteLogsModal() {
    if (!canUserDeleteLogs()) return;
    document.getElementById('delLogDate').value = getTodayMMDDYYYY();
    document.getElementById('delLogPassword').value = '';
    document.getElementById('deleteLogsModal').style.display = 'flex';
}
function closeDeleteLogsModal() { document.getElementById('deleteLogsModal').style.display = 'none'; }

async function confirmDeleteLogsByDate() {
    const rawDateInput = document.getElementById('delLogDate').value.trim();
    const passwordInput = document.getElementById('delLogPassword').value.trim();
    if (!rawDateInput || !passwordInput) {
        showSystemAlert("Validation Error", "Please complete both target date and authorization password.", "⚠️");
        return;
    }

    const expectedPass = String(currentUser.pass || "").trim();
    if (expectedPass && passwordInput !== expectedPass) {
        showSystemAlert("Authorization Failed", "Incorrect Super Admin password.", "❌");
        return;
    }

    const targetDateMDY = formatCleanDate(rawDateInput.includes('-') ? isoToMMDDYYYY(rawDateInput) : rawDateInput);
    const confirmBtn = document.querySelector('#deleteLogsModal button[onclick="confirmDeleteLogsByDate()"]');
    if (confirmBtn) confirmBtn.disabled = true;

    isSavingTicket = true;
    updateSyncStatusBadge("syncing");

    try {
        const filteredQueue = loadPendingSyncQueue().filter(
            item => formatCleanDate(item?.ticketObj?.dateReceived || "") !== targetDateMDY
        );
        savePendingSyncQueue(filteredQueue);

        AppState.tickets = AppState.tickets.filter(t => formatCleanDate(t.dateReceived) !== targetDateMDY);
        saveStorage();
        renderTable();
        closeDeleteLogsModal();

        const resp = await fetchWithRetry(APPS_SCRIPT_URL, {
            method: "POST",
            headers: { "Content-Type": "text/plain;charset=utf-8" },
            body: JSON.stringify({
                action: "deleteLogsByDate",
                date: targetDateMDY,
                password: passwordInput
            })
        }, 3);

        const rawText = await resp.text();
        let resData = {};
        try {
            resData = JSON.parse(rawText);
        } catch (e) {}

        if (resData && resData.status === "error") {
            throw new Error(resData.message || "Failed to delete logs in Google Sheets.");
        }

        await fetchFromGoogleSheets();
        updateSyncStatusBadge("synced");
        const countInfo = typeof resData.deletedCount === "number" ? ` (${resData.deletedCount} row(s) removed)` : "";
        showToast(`Deleted logs for ${targetDateMDY} in Google Sheets${countInfo}.`);
    } catch (e) {
        console.error("Delete logs by date failed:", e);
        updateSyncStatusBadge("error");
        showSystemAlert("Backend Delete Error", e.message || "Could not delete logs from Google Sheets. Please check your Apps Script deployment.", "❌");
    } finally {
        isSavingTicket = false;
        if (confirmBtn) confirmBtn.disabled = false;
    }
}

function captureTicketModalDraft() {
    const customValues = {};
    if (AppState.settings.customFields) {
        AppState.settings.customFields.forEach(cf => {
            const el = document.getElementById(`customField_${cf.id}`);
            if (el) customValues[cf.id] = el.value;
        });
    }
    lastTicketModalDraft = {
        editIndex: document.getElementById('editIndex')?.value ?? '',
        originalReferralNo: editingTicketOriginalState ? editingTicketOriginalState.referralNo : '',
        adminNo: document.getElementById('formAdminNo')?.value ?? '',
        platform: document.getElementById('formPlatform')?.value ?? '',
        dateReceived: document.getElementById('formDateReceived')?.value ?? '',
        referralNo: document.getElementById('formReferralNo')?.value ?? '',
        complainantName: document.getElementById('formComplainantName')?.value ?? '',
        category: document.getElementById('formCategorySearch')?.value ?? '',
        ticketType: document.getElementById('formTicketType')?.value ?? '',
        ticketDetails: document.getElementById('formTicketDetails')?.value ?? '',
        responseDetails: document.getElementById('formResponseDetails')?.value ?? '',
        actionTaken: document.getElementById('formActionTaken')?.value ?? '',
        status: document.getElementById('formStatus')?.value ?? 'Closed',
        remarks: document.getElementById('formRemarks')?.value ?? '',
        is24Hours: !!document.getElementById('formSwitch24Hours')?.checked,
        customValues
    };
}

function restoreTicketModalDraft(draft) {
    if (!draft) return;
    document.getElementById('editIndex').value = draft.editIndex ?? '';
    document.getElementById('formAdminNo').value = draft.adminNo || currentUser.adminNo || deriveOperatorAdminNo(currentUser);
    if (draft.platform) document.getElementById('formPlatform').value = draft.platform;
    if (draft.dateReceived) setSystemDateInputValue('formDateReceived', draft.dateReceived);
    document.getElementById('formReferralNo').value = draft.referralNo || '';
    document.getElementById('formComplainantName').value = draft.complainantName || '';
    document.getElementById('formCategorySearch').value = draft.category || '';
    if (draft.ticketType) document.getElementById('formTicketType').value = draft.ticketType;
    document.getElementById('formTicketDetails').value = draft.ticketDetails || '';
    document.getElementById('formResponseDetails').value = draft.responseDetails || '';
    const actEl = document.getElementById('formActionTaken');
    if (actEl && draft.actionTaken) {
        if (!Array.from(actEl.options).some(o => o.value === draft.actionTaken)) {
            actEl.innerHTML += `<option value="${escapeHtml(draft.actionTaken)}">${escapeHtml(draft.actionTaken)}</option>`;
        }
        actEl.value = draft.actionTaken;
    }
    if (draft.status) document.getElementById('formStatus').value = draft.status;
    document.getElementById('formRemarks').value = draft.remarks || '';
    const sw24 = document.getElementById('formSwitch24Hours');
    if (sw24) sw24.checked = !!draft.is24Hours;
    if (draft.customValues && AppState.settings.customFields) {
        AppState.settings.customFields.forEach(cf => {
            const el = document.getElementById(`customField_${cf.id}`);
            if (el && draft.customValues[cf.id] !== undefined) el.value = draft.customValues[cf.id];
        });
    }
}

function openTicketModal(index = null) {
    pendingTicketSubmission = null;
    const dupModal = document.getElementById('duplicateWarningModal');
    if (dupModal) dupModal.style.display = 'none';

    const modal = document.getElementById('ticketModal');
    if (!modal) return;
    const formPlat = document.getElementById('formPlatform');
    if (formPlat && formPlat.options.length === 0) populateDropdowns();

    document.getElementById('formAdminNo').value = currentUser.adminNo || deriveOperatorAdminNo(currentUser);
    renderModalCustomFields();

    if (index !== null && index !== undefined && AppState.tickets[index]) {
        const t = AppState.tickets[index];
        if (!canUserEditTicket(t)) {
            showSystemAlert("Access Restricted", "You can only edit your own ticket logs. Only Super Admin and AdminTL can edit logs of other admins.", "🔒");
            return;
        }
        editingTicketOriginalState = {
            index: index,
            rowIndex: t.rowIndex || (index + 2),
            referralNo: String(t.referralNo || '').trim()
        };
        document.getElementById('editIndex').value = index;
        document.getElementById('modalTitle').textContent = `Edit Ticket Log (${t.referralNo})`;

        if (
            lastTicketModalDraft &&
            String(lastTicketModalDraft.editIndex) === String(index) &&
            String(lastTicketModalDraft.originalReferralNo || '') === String(t.referralNo || '').trim()
        ) {
            restoreTicketModalDraft(lastTicketModalDraft);
        } else {
            document.getElementById('formPlatform').value = t.platform || 'FACEBOOK';
            setSystemDateInputValue('formDateReceived', mmddyyyyToISO(t.dateReceived));
            document.getElementById('formReferralNo').value = t.referralNo || '';
            document.getElementById('formComplainantName').value = t.complainantName || '';
            document.getElementById('formCategorySearch').value = t.category || '';
            document.getElementById('formTicketType').value = t.ticketType || '';
            document.getElementById('formTicketDetails').value = t.ticketDetails || '';
            document.getElementById('formResponseDetails').value = t.responseDetails || '';
            const actEl = document.getElementById('formActionTaken');
            if (actEl) {
                if (t.actionTaken && !Array.from(actEl.options).some(o => o.value === t.actionTaken)) {
                    actEl.innerHTML += `<option value="${escapeHtml(t.actionTaken)}">${escapeHtml(t.actionTaken)}</option>`;
                }
                actEl.value = t.actionTaken || '';
            }
            document.getElementById('formStatus').value = t.status || 'Closed';
            document.getElementById('formRemarks').value = t.remarks || '';
            const sw24 = document.getElementById('formSwitch24Hours');
            if (sw24) sw24.checked = !!(t.is24Hours || (t.extraData && t.extraData.is24Hours));
            if (t.extraData && AppState.settings.customFields) {
                AppState.settings.customFields.forEach(cf => {
                    const el = document.getElementById(`customField_${cf.id}`);
                    if (el && t.extraData[cf.id] !== undefined) el.value = t.extraData[cf.id];
                });
            }
        }
    } else {
        editingTicketOriginalState = null;
        document.getElementById('editIndex').value = '';
        document.getElementById('modalTitle').textContent = `Create New Ticket Log Record`;

        if (lastTicketModalDraft && lastTicketModalDraft.editIndex === '') {
            restoreTicketModalDraft(lastTicketModalDraft);
        } else {
            setSystemDateInputValue('formDateReceived', getTodayISO());
            if (currentUser.defaultPortal && formPlat) formPlat.value = currentUser.defaultPortal;
            document.getElementById('formComplainantName').value = '';
            document.getElementById('formCategorySearch').value = '';
            document.getElementById('formTicketDetails').value = '';
            document.getElementById('formResponseDetails').value = '';
            const statusEl = document.getElementById('formStatus');
            if (statusEl) {
                const closedOpt = Array.from(statusEl.options).find(o => o.value.toLowerCase() === 'closed');
                statusEl.value = closedOpt ? closedOpt.value : 'Closed';
            }
            document.getElementById('formRemarks').value = '';
            const sw24 = document.getElementById('formSwitch24Hours');
            if (sw24) sw24.checked = false;
            autoGenTicketNo(true);
        }
    }
    update24HourSwitchVisibility();
    onPlatformChange();
    modal.style.display = 'flex';
}

function closeTicketModal(clearDraft = false) {
    pendingTicketSubmission = null;
    const dupModal = document.getElementById('duplicateWarningModal');
    if (dupModal) dupModal.style.display = 'none';
    if (clearDraft) {
        lastTicketModalDraft = null;
        editingTicketOriginalState = null;
    } else {
        captureTicketModalDraft();
    }
    document.getElementById('ticketModal').style.display = 'none';
}

function isWaitingForClientInfoAction(actionVal) {
    const clean = String(actionVal || '').toLowerCase().replace(/\s+/g, ' ').trim();
    return clean === 'waiting for further information /documents needed from the client' ||
           clean === 'waiting for further information / documents needed from the client';
}

function update24HourSwitchVisibility() {
    const actionVal = document.getElementById('formActionTaken')?.value || '';
    const statusVal = document.getElementById('formStatus')?.value || '';
    const wrapper = document.getElementById('switch24HoursWrapper');
    const toggleEl = document.getElementById('formSwitch24Hours');
    if (!wrapper) return;

    const shouldShow = isWaitingForClientInfoAction(actionVal) && statusVal.trim().toLowerCase() === 'pending';
    wrapper.classList.toggle('hidden', !shouldShow);
    if (!shouldShow && toggleEl) {
        toggleEl.checked = false;
    }
}

const TIMER_24H_CHECK_INTERVAL_MS = 15000;

function isWorkingDayDate(dateObj) {
    if (!(dateObj instanceof Date) || isNaN(dateObj.getTime())) return false;
    const day = dateObj.getDay();
    if (day === 0 || day === 6) return false;
    const iso = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;
    const offDates = Array.isArray(AppState?.toggledOffDates) ? AppState.toggledOffDates : [];
    return !offDates.includes(iso);
}

function computeWorking24HoursDueAt(startDateInput) {
    const start = startDateInput ? new Date(startDateInput) : new Date();
    const base = isNaN(start.getTime()) ? new Date() : start;
    const cursor = new Date(base.getTime());
    let remainingHours = 24;
    let safetyGuard = 0;

    while (remainingHours > 0 && safetyGuard < 2000) {
        cursor.setHours(cursor.getHours() + 1);
        if (isWorkingDayDate(cursor)) {
            remainingHours -= 1;
        }
        safetyGuard += 1;
    }
    return cursor.toISOString();
}

function ensureTicket24HourTimerFields(ticketObj, is24HoursActive) {
    const prevExtra = (ticketObj.extraData && typeof ticketObj.extraData === "object") ? ticketObj.extraData : {};
    const isClosed = String(ticketObj.status || "").trim().toLowerCase() === "closed";

    if (!is24HoursActive || isClosed) {
        return {
            ...prevExtra,
            is24Hours: false,
            timer24hStartedAt: null,
            timer24hDueAt: null,
            timer24hRemindedAt: prevExtra.timer24hRemindedAt || null
        };
    }

    const startedAt = prevExtra.timer24hStartedAt || new Date().toISOString();
    const dueAt = prevExtra.timer24hDueAt || computeWorking24HoursDueAt(startedAt);
    return {
        ...prevExtra,
        is24Hours: true,
        timer24hStartedAt: startedAt,
        timer24hDueAt: dueAt,
        timer24hRemindedAt: null
    };
}

function isTicket24HourExpired(ticket, now = new Date()) {
    if (!ticket) return false;
    const isClosed = String(ticket.status || "").trim().toLowerCase() === "closed";
    if (isClosed) return false;

    const extra = ticket.extraData || {};
    const active24h = !!(ticket.is24Hours || extra.is24Hours);
    if (!active24h) return false;

    const dueIso = extra.timer24hDueAt || (extra.timer24hStartedAt ? computeWorking24HoursDueAt(extra.timer24hStartedAt) : null);
    if (!dueIso) return false;

    const dueDate = new Date(dueIso);
    if (isNaN(dueDate.getTime())) return false;
    return dueDate <= now;
}

function getDue24HourReminders(now = new Date()) {
    return (AppState.tickets || [])
        .map((ticket, index) => ({ ticket, index }))
        .filter(({ ticket }) => isTicket24HourExpired(ticket, now) && isTicketOwnedByCurrentUser(ticket));
}

function formatDueCountdownOrLabel(ticket) {
    const extra = ticket?.extraData || {};
    const dueIso = extra.timer24hDueAt || (extra.timer24hStartedAt ? computeWorking24HoursDueAt(extra.timer24hStartedAt) : null);
    if (!dueIso) return "24h Working Timer";
    const d = new Date(dueIso);
    if (isNaN(d.getTime())) return "24h Working Timer";
    return d.toLocaleString("en-PH", {
        month: "short",
        day: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    });
}

function render24HourReminderBanner() {
    const banner = document.getElementById("reminder24hBanner");
    const listEl = document.getElementById("reminder24hList");
    if (!banner || !listEl) return;

    const dueItems = getDue24HourReminders(new Date());
    if (!dueItems.length) {
        banner.classList.add("hidden");
        listEl.innerHTML = "";
        return;
    }

    banner.classList.remove("hidden");
    listEl.innerHTML = dueItems.map(({ ticket, index }) => {
        const dueLabel = formatDueCountdownOrLabel(ticket);
        return `
            <div class="flex flex-wrap items-center justify-between gap-2 bg-slate-950/90 border border-amber-500/40 rounded-lg px-3 py-2 text-xs">
                <div class="space-y-0.5 min-w-0">
                    <div class="flex items-center gap-2 flex-wrap">
                        <span class="font-mono font-extrabold text-amber-300">${escapeHtml(ticket.referralNo || "NO REF #")}</span>
                        <span class="text-white font-bold">${escapeHtml(ticket.complainantName || "Client")}</span>
                        <span class="text-[10px] font-mono text-rose-300 bg-rose-950/80 border border-rose-800/60 px-2 py-0.5 rounded">Due: ${escapeHtml(dueLabel)}</span>
                    </div>
                    <p class="text-[11px] text-slate-300">Naubos na ang 24h working timer. I-check kung may response na ang client o i-close na.</p>
                </div>
                <div class="flex items-center gap-2 shrink-0">
                    <button type="button" onclick="openTicketModal(${index})" class="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-sky-300 border border-slate-700 rounded-lg font-bold text-[11px] transition">Check Client</button>
                    <button type="button" onclick="autoCloseTicketFromReminder(${index})" class="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-extrabold text-[11px] shadow transition">✓ Close Now (Auto-Close)</button>
                </div>
            </div>
        `;
    }).join("");
}

async function autoCloseTicketFromReminder(ticketIndex) {
    const existing = AppState.tickets[ticketIndex];
    if (!existing) return;

    const closedStatusOption = (AppState.settings?.statuses || []).find(s => String(s).toLowerCase() === "closed") || "Closed";
    const actorTag = currentUser.adminNo || deriveOperatorAdminNo(currentUser) || currentUser.username || "Admin";
    const autoNote = `Auto-closed after 24h working timer reminder check by ${actorTag}.`;
    const cleanedRemarks = String(existing.remarks || "")
        .replace(/\s*\|\s*24 HOURS/gi, "")
        .replace(/^24 HOURS$/i, "")
        .trim();

    const updatedTicket = {
        ...existing,
        status: closedStatusOption,
        is24Hours: false,
        remarks: cleanedRemarks ? `${cleanedRemarks} | ${autoNote}` : autoNote,
        extraData: {
            ...(existing.extraData || {}),
            is24Hours: false,
            timer24hDueAt: null,
            timer24hRemindedAt: new Date().toISOString(),
            autoClosedAt: new Date().toISOString(),
            autoClosedBy: actorTag
        }
    };

    const editIdxStr = String(ticketIndex);
    await persistTicketSubmission(updatedTicket, editIdxStr);
    render24HourReminderBanner();
    showToast(`Ticket ${updatedTicket.referralNo || ""} awtomatikong na-close.`);
}

function getPlatformSetting(platformName) {
    if (!platformName || !AppState.settings.platforms) return null;
    return AppState.settings.platforms.find(p => (typeof p === 'string' ? p : p.name).toUpperCase() === platformName.toUpperCase());
}

function isAutoPlatform(platformName) {
    const pObj = getPlatformSetting(platformName);
    return pObj && typeof pObj === 'object' ? !!pObj.autoGen : false;
}

function onPlatformChange() {
    const platform = document.getElementById('formPlatform')?.value || 'FACEBOOK';
    const refInput = document.getElementById('formReferralNo');
    const btnAutoGen = document.getElementById('btnAutoGen');
    const labelMode = document.getElementById('ticketGenModeLabel');
    const isEditing = (document.getElementById('editIndex')?.value ?? '') !== '';
    if (!refInput) return;

    if (isAutoPlatform(platform)) {
        refInput.readOnly = true;
        if (btnAutoGen) btnAutoGen.style.display = 'inline-block';
        if (labelMode) labelMode.textContent = isEditing ? "(Existing Ticket #)" : "(Auto-Generated)";
        if (!isEditing || !refInput.value.trim()) {
            autoGenTicketNo(!isEditing);
        }
    } else {
        refInput.readOnly = false;
        if (btnAutoGen) btnAutoGen.style.display = 'none';
        if (labelMode) labelMode.textContent = "(Manual Input)";
        if (!isEditing && !refInput.value.trim()) refInput.value = '';
    }
}

function autoGenTicketNo(force = false) {
    const editIdx = document.getElementById('editIndex').value;
    if (editIdx !== '' && !force) return;
    const platName = document.getElementById('formPlatform')?.value;
    const pObj = getPlatformSetting(platName);
    if (!pObj || !pObj.autoGen) return;

    const prefixCode = (pObj.prefix || platName || 'CPAO').toUpperCase();
    const dateIso = document.getElementById('formDateReceived')?.value || getTodayISO();
    const parts = dateIso.split('-');
    const dateCode = parts.length === 3 ? `${parts[1]}${parts[2]}${parts[0]}` : "05152026";
    const adminNum = (currentUser.adminNo || currentUser.username || "").replace(/\D/g, '') || (currentUser.username || "OP").toUpperCase();

    let maxSeq = 0;
    const prefixPattern = new RegExp(`^${prefixCode}-${dateCode}-${adminNum}-(\\d+)$`, 'i');
    AppState.tickets.forEach(t => {
        if (t.referralNo) {
            const match = t.referralNo.trim().match(prefixPattern);
            if (match && match[1]) {
                const num = parseInt(match[1], 10);
                if (!isNaN(num) && num > maxSeq) maxSeq = num;
            }
        }
    });

    const nextSeq = String(maxSeq + 1).padStart(2, '0');
    document.getElementById('formReferralNo').value = `${prefixCode}-${dateCode}-${adminNum}-${nextSeq}`;
}

function addAdminPrefix() {
    const respArea = document.getElementById('formResponseDetails');
    if(!respArea) return;
    const adminTag = `[${currentUser.adminNo || deriveOperatorAdminNo(currentUser)}] `;
    if (!respArea.value.startsWith(adminTag)) respArea.value = adminTag + respArea.value;
    respArea.focus();
}

function findMatchingExistingTickets(complainantName, category, editIndexStr) {
    const cleanName = String(complainantName || '').trim().toLowerCase();
    const cleanCat = String(category || '').trim().toLowerCase();
    if (!cleanName || !cleanCat) return [];

    const editIdxNum = editIndexStr !== '' ? parseInt(editIndexStr, 10) : -1;

    return AppState.tickets.filter((t, idx) => {
        if (idx === editIdxNum) return false;
        const tName = String(t.complainantName || '').trim().toLowerCase();
        const tCat = String(t.category || '').trim().toLowerCase();
        return tName === cleanName && tCat === cleanCat;
    });
}

function showDuplicateWarningModal(matches, complainantName, category, ticketObj, editIdxStr) {
    pendingTicketSubmission = { ticketObj, editIdxStr };
    document.getElementById('dupComplainantLabel').textContent = complainantName;
    document.getElementById('dupCategoryLabel').textContent = category;

    const detailsBox = document.getElementById('dupExistingDetailsBox');
    detailsBox.innerHTML = matches.map((m, i) => `
        <div class="p-2.5 rounded-lg bg-slate-900 border border-slate-800 space-y-1">
            <div class="flex items-center justify-between gap-2">
                <span class="font-mono font-bold text-amber-400">Record #${i + 1}: ${escapeHtml(m.referralNo || '—')}</span>
                <span class="text-[10px] font-mono text-slate-400">${escapeHtml(m.dateReceived || '—')}</span>
            </div>
            <div class="text-[11px] text-slate-300"><strong class="text-slate-400">Admin:</strong> ${escapeHtml(m.adminNo || '—')} • <strong class="text-slate-400">Platform:</strong> ${escapeHtml(m.platform || '—')} • <strong class="text-slate-400">Status:</strong> <span class="font-bold ${m.status === 'Closed' ? 'text-emerald-400' : 'text-amber-400'}">${escapeHtml(m.status || '—')}</span></div>
            <div class="text-[11px] text-slate-300"><strong class="text-slate-400">Ticket Details:</strong> ${escapeHtml(m.ticketDetails || '—')}</div>
            <div class="text-[11px] text-slate-300"><strong class="text-slate-400">Response:</strong> ${escapeHtml(m.responseDetails || '—')}</div>
        </div>
    `).join('');

    document.getElementById('duplicateWarningModal').style.display = 'flex';
}

function cancelDuplicateTicketSave() {
    pendingTicketSubmission = null;
    document.getElementById('duplicateWarningModal').style.display = 'none';
}

async function proceedDuplicateTicketSave() {
    if (!pendingTicketSubmission) return;
    const { ticketObj, editIdxStr } = pendingTicketSubmission;
    pendingTicketSubmission = null;
    document.getElementById('duplicateWarningModal').style.display = 'none';
    await persistTicketSubmission(ticketObj, editIdxStr);
}

async function validateAndSubmitTicketForm(e) {
    e.preventDefault();
    const complainantName = document.getElementById('formComplainantName').value.trim();
    const category = document.getElementById('formCategorySearch').value.trim();
    const ticketDetails = document.getElementById('formTicketDetails').value.trim();
    const responseDetails = document.getElementById('formResponseDetails').value.trim();
    const selectedStatus = document.getElementById('formStatus')?.value || 'Closed';

    if (!complainantName) { showSystemAlert("Validation Error", "Complainant Name is required.", "⚠️"); return; }
    if (!category) { showSystemAlert("Validation Error", "Category is required.", "⚠️"); return; }
    if (!ticketDetails) { showSystemAlert("Validation Error", "Details of Ticket / Concern is required.", "⚠️"); return; }
    if (!responseDetails) { showSystemAlert("Validation Error", "Details of Response is required.", "⚠️"); return; }

    const editIdxStr = document.getElementById('editIndex').value;
    const actionTakenVal = document.getElementById('formActionTaken').value;
    const is24HoursActive = isWaitingForClientInfoAction(actionTakenVal) &&
        selectedStatus.trim().toLowerCase() === 'pending' &&
        !!document.getElementById('formSwitch24Hours')?.checked;

    let extraData = {};
    if (AppState.settings.customFields) {
        AppState.settings.customFields.forEach(cf => {
            const el = document.getElementById(`customField_${cf.id}`);
            if (el) extraData[cf.id] = el.value.trim();
        });
    }
    const existingTicket = editIdxStr !== '' ? AppState.tickets[parseInt(editIdxStr, 10)] : null;
    if (existingTicket && existingTicket.extraData) {
        extraData = { ...existingTicket.extraData, ...extraData };
    }
    extraData = ensureTicket24HourTimerFields({ status: selectedStatus, extraData }, is24HoursActive);

    let finalRemarks = document.getElementById('formRemarks').value.trim();
    if (is24HoursActive) {
        if (!/\b24\s*hours\b/i.test(finalRemarks)) {
            finalRemarks = finalRemarks ? `${finalRemarks} | 24 HOURS` : '24 HOURS';
        }
    } else {
        finalRemarks = finalRemarks.replace(/\s*\|\s*24 HOURS/gi, '').replace(/^24 HOURS$/i, '').trim();
    }

    const ticketObj = {
        adminNo: document.getElementById('formAdminNo').value.trim() || currentUser.adminNo || deriveOperatorAdminNo(currentUser),
        platform: document.getElementById('formPlatform').value,
        referralNo: document.getElementById('formReferralNo').value.trim(),
        dateReceived: isoToMMDDYYYY(document.getElementById('formDateReceived').value),
        category: category,
        ticketType: document.getElementById('formTicketType').value,
        complainantName: complainantName,
        ticketDetails: ticketDetails,
        responseDetails: responseDetails,
        actionTaken: actionTakenVal,
        status: selectedStatus,
        remarks: finalRemarks,
        is24Hours: is24HoursActive,
        extraData: extraData
    };

    const matches = findMatchingExistingTickets(complainantName, category, editIdxStr);
    if (matches.length > 0) {
        showDuplicateWarningModal(matches, complainantName, category, ticketObj, editIdxStr);
        return;
    }

    await persistTicketSubmission(ticketObj, editIdxStr);
}

function isUnknownActionErrorMessage(msg) {
    return /unknown\s*action/i.test(String(msg || ""));
}

async function fetchWithRetry(url, options, maxAttempts = 3) {
    let lastErr = null;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            const resp = await fetch(url, options);
            if (!resp.ok) {
                throw new Error(`HTTP ${resp.status} ${resp.statusText}`);
            }
            return resp;
        } catch (err) {
            lastErr = err;
            if (attempt < maxAttempts) {
                await new Promise(resolve => setTimeout(resolve, 350 * attempt));
            }
        }
    }
    throw lastErr;
}

async function sendTicketPayloadToAppsScript(actionName, targetRowIdx, ticketObj) {
    const cleanTicket = {
        ...ticketObj,
        extraData: ticketObj && ticketObj.extraData && typeof ticketObj.extraData === "object"
            ? JSON.parse(JSON.stringify(ticketObj.extraData))
            : {}
    };
    const payload = {
        action: actionName,
        rowIndex: targetRowIdx,
        ticket: cleanTicket,
        data: cleanTicket,
        ...cleanTicket
    };

    const resp = await fetchWithRetry(APPS_SCRIPT_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(payload)
    }, 2);

    const rawText = await resp.text();
    let resData = null;
    try {
        resData = JSON.parse(rawText);
    } catch (parseErr) {
        console.warn("Non-JSON response from Apps Script:", rawText);
    }

    const errMsg = resData && (resData.status === "error" || resData.error || resData.ok === false)
        ? (resData.message || resData.error || "Apps Script rejected the request.")
        : "";

    return { resData, errMsg };
}

async function persistTicketSubmission(ticketObj, editIdxStr) {
    const submitBtn = document.getElementById('btnSubmitTicket');
    if (submitBtn) submitBtn.disabled = true;
    isSavingTicket = true;
    updateSyncStatusBadge("syncing");

    try {
        ticketObj.status = ticketObj.status || "Closed";

        const isEditing = editIdxStr !== '';
        let targetRowIdx = null;
        let savedIndex = -1;

        const originalRefNo = editingTicketOriginalState ? String(editingTicketOriginalState.referralNo || '').trim() : '';

        if (isEditing) {
            let idx = parseInt(editIdxStr, 10);
            if (
                editingTicketOriginalState &&
                (!AppState.tickets[idx] ||
                    (originalRefNo && String(AppState.tickets[idx].referralNo || '').trim() !== originalRefNo))
            ) {
                const foundByRow = AppState.tickets.findIndex(
                    t => editingTicketOriginalState.rowIndex && String(t.rowIndex) === String(editingTicketOriginalState.rowIndex)
                );
                const foundByRef = originalRefNo
                    ? AppState.tickets.findIndex(t => String(t.referralNo || '').trim() === originalRefNo)
                    : -1;
                if (foundByRow >= 0) idx = foundByRow;
                else if (foundByRef >= 0) idx = foundByRef;
            }

            if (idx >= 0 && AppState.tickets[idx]) {
                targetRowIdx = AppState.tickets[idx].rowIndex || (editingTicketOriginalState && editingTicketOriginalState.rowIndex) || (idx + 2);
                if (!ticketObj.referralNo && originalRefNo) {
                    ticketObj.referralNo = originalRefNo;
                }
                ticketObj.rowIndex = targetRowIdx;
                AppState.tickets[idx] = { ...AppState.tickets[idx], ...ticketObj };
                savedIndex = idx;
            }
        } else {
            AppState.tickets.push({ ...ticketObj });
            savedIndex = AppState.tickets.length - 1;
        }

        if (isEditing && originalRefNo) {
            ticketObj.originalReferralNo = originalRefNo;
        }

        const clientKey = `${String(ticketObj.referralNo || '').trim().toLowerCase()}|${String(ticketObj.dateReceived || '').trim()}|${String(ticketObj.complainantName || '').trim().toLowerCase()}`;
        enqueuePendingTicketSync(ticketObj, isEditing, targetRowIdx);

        saveStorage();
        renderTable();
        updateKPIs();
        closeTicketModal(true);
        showToast(`Saved reliably (${ticketObj.status}). Syncing with Google Sheets...`);
        if (submitBtn) submitBtn.disabled = false;

        const storageKey = isEditing ? LAST_WORKING_UPDATE_ACTION_KEY : LAST_WORKING_ADD_ACTION_KEY;
        const cachedAction = localStorage.getItem(storageKey);
        const candidates = isEditing
            ? [cachedAction, "updateLog", "updateTicket", "update", "editLog", "edit", "saveLog", "save"].filter(Boolean)
            : [cachedAction, "addLog", "addTicket", "createLog", "createTicket", "create", "add", "insert", "append", "saveLog", "save"].filter(Boolean);
        const actionCandidates = Array.from(new Set(candidates));

        let lastError = null;
        let synced = false;
        let finalData = null;

        for (const act of actionCandidates) {
            const { resData, errMsg } = await sendTicketPayloadToAppsScript(act, targetRowIdx, ticketObj);
            if (!errMsg) {
                localStorage.setItem(storageKey, act);
                synced = true;
                finalData = resData;
                break;
            }
            lastError = new Error(errMsg);
            if (isUnknownActionErrorMessage(errMsg)) {
                continue;
            }
            break;
        }

        if (!synced) {
            throw lastError || new Error("Unable to sync record with Google Sheets.");
        }

        removePendingTicketSync(clientKey);
        if (savedIndex >= 0 && AppState.tickets[savedIndex] && finalData && finalData.rowIndex) {
            AppState.tickets[savedIndex].rowIndex = finalData.rowIndex;
            saveStorage();
        }
        updateSyncStatusBadge("synced");
        showToast(isEditing ? "Ticket log updated in Google Sheets." : "New ticket log saved to Google Sheets.");
    } catch (err) {
        console.error("Error syncing ticket log:", err);
        updateSyncStatusBadge("queued");
        showToast("Saved locally & queued for automatic Google Sheets sync.");
    } finally {
        isSavingTicket = false;
        if (submitBtn) submitBtn.disabled = false;
    }
}

function deleteTicket(index) {
    if (!canUserDeleteLogs()) { showSystemAlert("Access Denied", "You do not have permission to delete log records.", "🔒"); return; }
    const ticket = AppState.tickets[index];
    if (!ticket) return;
    showSystemConfirm("Delete Ticket Log", `Are you sure you want to delete ticket ${ticket.referralNo || 'this record'}?`, async () => {
        AppState.tickets.splice(index, 1);
        saveStorage();
        renderTable();
        updateKPIs();
        try {
            await fetchWithRetry(APPS_SCRIPT_URL, {
                method: "POST",
                headers: { "Content-Type": "text/plain;charset=utf-8" },
                body: JSON.stringify({ action: "deleteLog", rowIndex: ticket.rowIndex, referralNo: ticket.referralNo })
            }, 2);
            showToast("Ticket log deleted.");
        } catch (e) {
            showToast("Deleted locally. Will sync when online.");
        }
    });
}

function exportCSV() {
    const filtered = getFilteredTickets();
    let csv = 'Admin No,Platform,Ticket No,Date Received,Category,Type,Complainant,Details,Response,Action Taken,Status,Remarks\n' +
        filtered.map(t => `"${t.adminNo}","${t.platform}","${t.referralNo}","${t.dateReceived}","${t.category}","${t.ticketType}","${t.complainantName}","${(t.ticketDetails || '').replace(/"/g, '""')}","${(t.responseDetails || '').replace(/"/g, '""')}","${t.actionTaken}","${t.status}","${t.remarks}"`).join('\n');
    let blob = new Blob([csv], { type: 'text/csv' });
    let a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `LTO_Logs_${getTodayISO()}.csv`; a.click();
}

function runWorkflow() {
    const t = document.getElementById('wfType').value;
    const out = document.getElementById('wfOutput');
    if (!out) return;
    if (t === 'Simple') out.textContent = "Due Limit: 3 Working Days (Simple Request / Information)";
    else if (t === 'Complex') out.textContent = "Due Limit: 7 Working Days (Complex Verification)";
    else out.textContent = "Due Limit: 20 Working Days (Highly Technical / Regional Endorsement)";
}

function renderSnippets() {
    const grid = document.getElementById('snippetsGrid');
    if (!grid) return;
    grid.innerHTML = '';
    (AppState.templates || []).forEach((tpl) => {
        const card = document.createElement('div');
        card.className = 'bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between gap-3';
        card.innerHTML = `
            <div>
                <h4 class="font-extrabold text-xs text-amber-400 uppercase mb-1.5">${escapeHtml(tpl.title)}</h4>
                <p class="text-xs text-slate-300 leading-relaxed">${escapeHtml(tpl.text)}</p>
            </div>
            <button type="button" onclick="copySnippetText('${escapeHtml(tpl.text).replace(/'/g, "\\'")}')" class="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-sky-300 rounded-lg text-xs font-bold self-end transition">📋 Copy Response</button>
        `;
        grid.appendChild(card);
    });
}

function copySnippetText(txt) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(txt).then(() => showToast("Copied to clipboard.")).catch(() => showToast("Copied."));
    } else {
        showToast("Copied.");
    }
}

function changeCalcMonth(dir) {
    calcCurrentMonth += dir;
    if (calcCurrentMonth > 11) { calcCurrentMonth = 0; calcCurrentYear++; }
    if (calcCurrentMonth < 0) { calcCurrentMonth = 11; calcCurrentYear--; }
    renderCalcCalendar();
}

function renderCalcCalendar() {
    const grid = document.getElementById('calcCalendarGrid');
    const label = document.getElementById('calcMonthLabel');
    if (!grid || !label) return;
    const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    label.textContent = `${months[calcCurrentMonth]} ${calcCurrentYear}`;

    let html = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => `<div class="text-[10px] font-bold text-slate-500 py-1">${d}</div>`).join('');
    const firstDay = new Date(calcCurrentYear, calcCurrentMonth, 1).getDay();
    const totalDays = new Date(calcCurrentYear, calcCurrentMonth + 1, 0).getDate();

    for (let i = 0; i < firstDay; i++) html += `<div></div>`;
    for (let day = 1; day <= totalDays; day++) {
        const iso = `${calcCurrentYear}-${String(calcCurrentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const isOff = AppState.toggledOffDates.includes(iso);
        const cls = isOff ? 'bg-rose-950/80 text-rose-300 border border-rose-800/60 line-through' : 'bg-slate-950 text-slate-200 border border-slate-800 hover:border-sky-500';
        html += `<button type="button" onclick="toggleOffDate('${iso}')" class="calc-date-toggle-btn p-2 rounded-lg text-xs font-mono font-bold transition ${cls}">${day}</button>`;
    }
    grid.innerHTML = html;
}

function toggleOffDate(iso) {
    if (!canUserEditWorkdayOffDates()) return;
    const idx = AppState.toggledOffDates.indexOf(iso);
    if (idx >= 0) AppState.toggledOffDates.splice(idx, 1);
    else AppState.toggledOffDates.push(iso);
    AppState.toggledOffDates.sort();
    saveOffDatesStorage(true);
    renderCalcCalendar();
    renderSavedOffDatesSummary();
    runWorkdayCalculator();
}

function clearAllOffDates() {
    if (!canUserEditWorkdayOffDates()) return;
    showSystemConfirm("Reset Off Dates", "Clear all saved non-working / off dates?", () => {
        AppState.toggledOffDates = [];
        saveOffDatesStorage(true);
        renderCalcCalendar();
        renderSavedOffDatesSummary();
        runWorkdayCalculator();
    });
}

function renderSavedOffDatesSummary() {
    const badge = document.getElementById('offDatesCountBadge');
    const listEl = document.getElementById('savedOffDatesList');
    const list = AppState.toggledOffDates || [];
    if (badge) badge.textContent = `${list.length} Off Date${list.length === 1 ? '' : 's'} Saved`;
    if (!listEl) return;
    if (!list.length) {
        listEl.innerHTML = `<span class="text-slate-500 italic">No off dates saved.</span>`;
        return;
    }
    listEl.innerHTML = list.map(d => `
        <span class="px-2 py-0.5 rounded bg-rose-950/80 border border-rose-800/60 text-rose-300 font-mono text-[10px] font-bold">
            ${escapeHtml(isoToMMDDYYYY(d))}
            <button type="button" onclick="toggleOffDate('${d}')" class="off-date-remove-btn ml-1 text-rose-400 hover:text-white">✕</button>
        </span>
    `).join('');
}

function runWorkdayCalculator() {
    const startIso = document.getElementById('calcStartDate')?.value || getTodayISO();
    const days = parseInt(document.getElementById('calcDays')?.value || '3', 10);
    const dueStr = addWorkingDays(isoToMMDDYYYY(startIso), days);
    const resEl = document.getElementById('calcResults');
    if (resEl) resEl.textContent = `Target Resolution Date (${days} Working Days): ${dueStr}`;
}

function escapeHtml(unsafe) {
    if (unsafe === null || unsafe === undefined) return '';
    return String(unsafe)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function populateReportFilterDropdowns() {
    ensureCategoryGroupsInitialized();
    const portalSel = document.getElementById('repFilterPortal');
    const catSel = document.getElementById('repFilterCategory');

    if (portalSel) {
        const prevPortals = Array.from(portalSel.selectedOptions || []).map(o => o.value);
        portalSel.innerHTML = '';
        (AppState.settings.platforms || []).forEach(p => {
            const pName = typeof p === 'string' ? p : p.name;
            const opt = document.createElement('option');
            opt.value = pName;
            opt.textContent = pName;
            if (prevPortals.includes(pName)) opt.selected = true;
            portalSel.appendChild(opt);
        });
    }

    if (catSel) {
        const prevCats = Array.from(catSel.selectedOptions || []).map(o => o.value);
        catSel.innerHTML = '';
        const allCats = Array.from(new Set([
            ...(AppState.settings.categories || []),
            ...(AppState.tickets || []).map(t => (t.category || '').trim()).filter(Boolean)
        ]));
        allCats.forEach(c => {
            const opt = document.createElement('option');
            opt.value = c;
            opt.textContent = c;
            if (prevCats.includes(c)) opt.selected = true;
            catSel.appendChild(opt);
        });
    }
}

function clearReportMultiSelect(selectId) {
    const sel = document.getElementById(selectId);
    if (!sel) return;
    Array.from(sel.options).forEach(o => { o.selected = false; });
    generateReport();
}

function getSelectedMultiValues(selectId) {
    const sel = document.getElementById(selectId);
    if (!sel) return [];
    return Array.from(sel.selectedOptions || []).map(o => o.value).filter(Boolean);
}

function buildSvgPieChart(slices, totalValue, titleText, extraCardClass = "") {
    const palette = ["#2563eb", "#0d9488", "#d97706", "#7c3aed", "#db2777", "#059669", "#4f46e5", "#dc2626"];
    if (!totalValue || slices.length === 0) {
        return `
            <div class="report-card-avoid-break ${extraCardClass} p-4 bg-slate-50 border border-slate-300 rounded-xl flex flex-col justify-center items-center text-center min-h-[180px]">
                <h5 class="font-extrabold text-xs text-slate-800 uppercase tracking-wide mb-2">${escapeHtml(titleText)}</h5>
                <p class="text-xs text-slate-500 italic">No data available for pie chart.</p>
            </div>
        `;
    }

    const radius = 56;
    const circumference = 2 * Math.PI * radius;
    let cumulativePercent = 0;

    const circlesHtml = slices.map((s, idx) => {
        const pct = s.value / totalValue;
        const dashLength = pct * circumference;
        const dashOffset = -(cumulativePercent * circumference);
        cumulativePercent += pct;
        const color = palette[idx % palette.length];
        return `
            <circle cx="70" cy="70" r="${radius}" fill="transparent" stroke="${color}" stroke-width="24"
                stroke-dasharray="${dashLength.toFixed(2)} ${circumference.toFixed(2)}"
                stroke-dashoffset="${dashOffset.toFixed(2)}"
                transform="rotate(-90 70 70)" />
        `;
    }).join('');

    const legendHtml = slices.map((s, idx) => {
        const color = palette[idx % palette.length];
        const pctText = ((s.value / totalValue) * 100).toFixed(1);
        return `
            <div class="flex items-center justify-between gap-2 text-[11px] py-1">
                <div class="flex items-center gap-2 min-w-0">
                    <span class="w-3 h-3 rounded-sm shrink-0" style="background:${color}; background-color:${color};"></span>
                    <span class="font-semibold text-slate-700 truncate">${escapeHtml(s.label)}</span>
                </div>
                <span class="font-mono font-bold text-slate-900 shrink-0">${s.value} (${pctText}%)</span>
            </div>
        `;
    }).join('');

    return `
        <div class="report-card-avoid-break ${extraCardClass} p-4 bg-slate-50 border border-slate-300 rounded-xl space-y-3">
            <h5 class="font-extrabold text-xs text-slate-800 uppercase tracking-wide">${escapeHtml(titleText)}</h5>
            <div class="flex flex-col sm:flex-row items-center gap-4">
                <svg viewBox="0 0 140 140" class="w-32 h-32 shrink-0">
                    ${circlesHtml}
                    <circle cx="70" cy="70" r="32" fill="#f8fafc" />
                    <text x="70" y="67" text-anchor="middle" font-size="11" font-weight="800" fill="#0f172a">${totalValue}</text>
                    <text x="70" y="80" text-anchor="middle" font-size="7" font-weight="700" fill="#64748b">${escapeHtml((getColumnLabelsConfig().graphTotalLabel || "TOTAL").toUpperCase())}</text>
                </svg>
                <div class="flex-1 w-full divide-y divide-slate-200">
                    ${legendHtml}
                </div>
            </div>
        </div>
    `;
}

function buildBarChart(bars, titleText, barColorClass = "bg-blue-600") {
    const maxVal = Math.max(...bars.map(b => b.value), 1);
    const hasAny = bars.some(b => b.value > 0);
    const fillHex = resolveBarFillHex(barColorClass);
    return `
        <div class="report-card-avoid-break p-3.5 bg-slate-50 border border-slate-300 rounded-xl space-y-2.5">
            <h5 class="font-extrabold text-[11px] text-slate-800 uppercase tracking-wide">${escapeHtml(titleText)}</h5>
            ${!hasAny ? `<p class="text-xs text-slate-500 italic">No data available for bar chart.</p>` : `
                <div class="space-y-1.5">
                    ${bars.map(b => {
                        const pct = Math.round((b.value / maxVal) * 100);
                        const widthVal = b.value > 0 ? Math.max(pct, 3) : 0;
                        return `
                            <div class="space-y-0.5">
                                <div class="flex justify-between text-[10.5px] font-semibold text-slate-700 gap-2">
                                    <span class="truncate">${escapeHtml(b.label)}</span>
                                    <span class="font-mono font-bold text-slate-900 shrink-0">${b.value}</span>
                                </div>
                                <div class="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden border border-slate-300" style="background-color: #e2e8f0;">
                                    <div class="${barColorClass} h-full rounded-full transition-all" style="width: ${widthVal}%; background-color: ${fillHex};"></div>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            `}
        </div>
    `;
}

function renderGraphPairHtml(graphType, hideEmpty, barData, barTitle, barColor, pieSlices, pieTotal, pieTitle) {
    if (graphType === 'none') return '';
    const hasData = pieTotal > 0;
    if (hideEmpty && !hasData) return '';

    const showBar = graphType === 'all' || graphType === 'bar';
    const showPie = graphType === 'all' || graphType === 'pie';
    const colClass = (showBar && showPie) ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1';

    return `
        <div class="grid ${colClass} gap-3 pt-1">
            ${showBar ? buildBarChart(barData, barTitle, barColor) : ''}
            ${showPie ? buildSvgPieChart(pieSlices, pieTotal, pieTitle) : ''}
        </div>
    `;
}

function generateReport() {
    if (!canUserGenerateReports()) return;
    setReportPreviewEditState(false);
    ensureCategoryGroupsInitialized();
    populateReportFilterDropdowns();

    const startISO = document.getElementById('repStartDate').value;
    const endISO = document.getElementById('repEndDate').value;
    if (!startISO || !endISO) { showSystemAlert("Date Required", "Please select both Start Date and End Date.", "⚠️"); return; }

    const selectedPortals = getSelectedMultiValues('repFilterPortal');
    const selectedCategories = getSelectedMultiValues('repFilterCategory');
    const graphType = document.getElementById('repGraphTypeSelect')?.value || 'all';
    const hideEmpty = !!document.getElementById('repHideEmptyCards')?.checked;

    const startDate = new Date(startISO + "T00:00:00");
    const endDate = new Date(endISO + "T23:59:59");

    const filteredTickets = AppState.tickets.filter(t => {
        if (!t.dateReceived) return false;
        const iso = mmddyyyyToISO(t.dateReceived);
        const tDate = new Date(iso + "T12:00:00");
        if (tDate < startDate || tDate > endDate) return false;

        if (selectedPortals.length > 0 && !selectedPortals.some(p => p.toUpperCase() === (t.platform || '').toUpperCase())) {
            return false;
        }
        if (selectedCategories.length > 0 && !selectedCategories.some(c => c.toLowerCase() === (t.category || '').trim().toLowerCase())) {
            return false;
        }
        return true;
    });

    const totalReceived = filteredTickets.length;
    const resolvedCount = filteredTickets.filter(t => t.status && t.status.toLowerCase() === 'closed').length;
    const pendingCount = totalReceived - resolvedCount;
    const overallEfficiency = totalReceived > 0 ? Math.round((resolvedCount / totalReceived) * 100) : 0;

    const platformStats = {};
    const portalListToSeed = selectedPortals.length > 0
        ? selectedPortals
        : (AppState.settings.platforms || []).map(p => typeof p === 'string' ? p : p.name);

    portalListToSeed.forEach(pName => {
        platformStats[pName] = { received: 0, resolved: 0, pending: 0 };
    });

    const categoryTotals = {};
    const groupStats = {};
    CATEGORY_GROUPS.forEach(grp => {
        groupStats[grp] = { total: 0, resolved: 0, pending: 0, categories: {} };
    });

    const monthNamesShort = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const coveredMonths = [];
    const monthCursor = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
    const endMonthCursor = new Date(endDate.getFullYear(), endDate.getMonth(), 1);
    while (monthCursor <= endMonthCursor) {
        coveredMonths.push({
            key: `${monthCursor.getFullYear()}-${String(monthCursor.getMonth() + 1).padStart(2, '0')}`,
            label: `${monthNamesShort[monthCursor.getMonth()]} ${monthCursor.getFullYear()}`
        });
        monthCursor.setMonth(monthCursor.getMonth() + 1);
    }

    const monthlyCategoryMatrix = {};
    filteredTickets.forEach(t => {
        const plat = t.platform || 'FACEBOOK';
        if (!platformStats[plat]) platformStats[plat] = { received: 0, resolved: 0, pending: 0 };
        platformStats[plat].received++;
        const isClosed = t.status && t.status.toLowerCase() === 'closed';
        if (isClosed) platformStats[plat].resolved++;
        else platformStats[plat].pending++;

        const cat = (t.category && t.category.trim() !== '') ? t.category.trim() : 'Uncategorized';
        if (!categoryTotals[cat]) categoryTotals[cat] = { total: 0, resolved: 0, pending: 0 };
        categoryTotals[cat].total++;
        if (isClosed) categoryTotals[cat].resolved++;
        else categoryTotals[cat].pending++;

        const grp = getGroupForCategory(cat);
        if (!groupStats[grp]) groupStats[grp] = { total: 0, resolved: 0, pending: 0, categories: {} };
        groupStats[grp].total++;
        if (isClosed) groupStats[grp].resolved++;
        else groupStats[grp].pending++;
        if (!groupStats[grp].categories[cat]) groupStats[grp].categories[cat] = { total: 0, resolved: 0, pending: 0 };
        groupStats[grp].categories[cat].total++;
        if (isClosed) groupStats[grp].categories[cat].resolved++;
        else groupStats[grp].categories[cat].pending++;

        const mKey = mmddyyyyToISO(t.dateReceived).substring(0, 7);
        if (!monthlyCategoryMatrix[cat]) monthlyCategoryMatrix[cat] = { total: 0 };
        monthlyCategoryMatrix[cat][mKey] = (monthlyCategoryMatrix[cat][mKey] || 0) + 1;
        monthlyCategoryMatrix[cat].total++;
    });

    const activePortalsList = Object.keys(platformStats).filter(p => platformStats[p].received > 0);
    const portalsForTable = hideEmpty ? activePortalsList : Object.keys(platformStats);
    const top10Concerns = Object.entries(categoryTotals).sort((a, b) => b[1].total - a[1].total).slice(0, 10);
    const matrixCategories = Object.entries(monthlyCategoryMatrix).sort((a, b) => b[1].total - a[1].total);

    const portalBars = portalsForTable.map(p => ({ label: p, value: platformStats[p].received })).sort((a, b) => b.value - a.value);
    const portalSlices = portalBars.filter(b => b.value > 0);

    const groupsToRender = hideEmpty
        ? CATEGORY_GROUPS.filter(grp => (groupStats[grp]?.total || 0) > 0)
        : CATEGORY_GROUPS;

    const groupBars = groupsToRender.map(grp => ({ label: grp, value: (groupStats[grp] || {}).total || 0 })).sort((a, b) => b.value - a.value);
    const groupSlices = groupBars.filter(b => b.value > 0);

    const categorizedBreakdownHtml = groupsToRender.length === 0 ? `
        <div class="p-4 text-center text-slate-500 italic text-xs border border-slate-300 rounded-xl bg-slate-50">
            No category records found matching your selected filters.
        </div>
    ` : groupsToRender.map(grp => {
        const gs = groupStats[grp] || { total: 0, resolved: 0, pending: 0, categories: {} };
        const subCats = Object.entries(gs.categories || {}).sort((a, b) => b[1].total - a[1].total);

        return `
            <div class="report-card-avoid-break border border-slate-300 rounded-xl overflow-hidden">
                <div class="bg-slate-100 px-3 py-1.5 flex items-center justify-between border-b border-slate-300">
                    <span class="font-extrabold text-[11px] text-slate-900 uppercase">${escapeHtml(grp)}</span>
                    <span class="font-mono text-[10px] font-bold text-slate-700">Total: ${gs.total}</span>
                </div>
                <table class="report-table-clean text-left text-[11px]">
                    <thead class="bg-slate-50 text-slate-700 text-[10px] uppercase">
                        <tr>
                            <th class="px-2.5 py-1.5">Category</th>
                            <th class="px-2.5 py-1.5 text-center w-20">RECEIVED</th>
                            <th class="px-2.5 py-1.5 text-center w-20">Resolved</th>
                            <th class="px-2.5 py-1.5 text-center w-20">Pending</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${subCats.length === 0 ? `
                            <tr><td colspan="4" class="px-2.5 py-2 text-center text-slate-400 italic text-[10.5px]">No logged concerns under this category group for the selected period.</td></tr>
                        ` : subCats.map(([cName, cStat]) => `
                            <tr class="bg-white">
                                <td class="px-2.5 py-1.5 font-semibold text-slate-800">${escapeHtml(cName)}</td>
                                <td class="px-2.5 py-1.5 text-center font-mono font-bold">${cStat.total}</td>
                                <td class="px-2.5 py-1.5 text-center font-mono text-emerald-700">${cStat.resolved}</td>
                                <td class="px-2.5 py-1.5 text-center font-mono text-rose-700">${cStat.pending}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }).join('');

    const top10Bars = top10Concerns.map(([cat, st], idx) => ({ label: `#${idx + 1}: ${cat}`, value: st.total }));
    const top10Slices = top10Concerns.map(([cat, st]) => ({ label: cat, value: st.total }));

    const sigSelectVal = document.getElementById('repPreparedBySelect')?.value || "0";
    let preparedByHtml = sigSelectVal === 'all'
        ? `<div class="grid grid-cols-3 gap-3 mt-6">${REPORT_SIGNATORIES.map(s => `<div><p class="font-bold text-slate-900 uppercase text-[10px]">${s.name}</p><p class="text-[9.5px] text-slate-600 mt-0.5">${s.designation}</p></div>`).join('')}</div>`
        : `<div class="mt-6"><p class="font-bold text-slate-900 uppercase text-[11px]">${(REPORT_SIGNATORIES[parseInt(sigSelectVal, 10)] || REPORT_SIGNATORIES[0]).name}</p><p class="text-[10px] text-slate-600 mt-0.5">${(REPORT_SIGNATORIES[parseInt(sigSelectVal, 10)] || REPORT_SIGNATORIES[0]).designation}</p></div>`;

    const filterBadgeText = [
        selectedPortals.length > 0 ? `Portals: ${selectedPortals.join(', ')}` : 'Portals: All',
        selectedCategories.length > 0 ? `Categories: ${selectedCategories.join(', ')}` : 'Categories: All'
    ].join(' • ');

    const cfg = AppState.settings.reportConfig || {};
    const showGroupPiePage = graphType !== 'none' && graphType !== 'bar' && (!hideEmpty || groupSlices.length > 0);
    const totalPages = showGroupPiePage ? 5 : 4;
    let pageCounter = 1;

    const page1Html = `
        <section class="report-a4-page">
            <div class="space-y-4">
                ${buildReportPageHeaderHtml(cfg, startISO, endISO, overallEfficiency, resolvedCount, totalReceived, "Report I — Executive Summary & Portal Breakdown")}
                <div class="text-[10px] font-mono text-slate-600 bg-slate-100 border border-slate-200 rounded px-2.5 py-1">
                    <strong>Active Scope:</strong> ${escapeHtml(filterBadgeText)}
                </div>

                <div class="grid grid-cols-4 gap-2.5 text-xs">
                    <div class="report-card-avoid-break bg-slate-50 border border-slate-300 p-3 rounded-xl text-center">
                        <span class="text-slate-500 uppercase font-bold text-[9.5px] block">Portals</span>
                        <span class="text-lg font-extrabold text-slate-900">${activePortalsList.length}</span>
                    </div>
                    <div class="report-card-avoid-break bg-blue-50 border border-blue-200 p-3 rounded-xl text-center">
                        <span class="text-blue-700 uppercase font-bold text-[9.5px] block">Received</span>
                        <span class="text-lg font-extrabold text-blue-900">${totalReceived}</span>
                    </div>
                    <div class="report-card-avoid-break bg-emerald-50 border border-emerald-200 p-3 rounded-xl text-center">
                        <span class="text-emerald-700 uppercase font-bold text-[9.5px] block">Resolved</span>
                        <span class="text-lg font-extrabold text-emerald-800">${resolvedCount}</span>
                    </div>
                    <div class="report-card-avoid-break bg-rose-50 border border-rose-200 p-3 rounded-xl text-center">
                        <span class="text-rose-700 uppercase font-bold text-[9.5px] block">Pending</span>
                        <span class="text-lg font-extrabold text-rose-800">${pendingCount}</span>
                    </div>
                </div>

                <div class="space-y-2.5">
                    <h4 class="font-extrabold text-xs uppercase border-b border-slate-300 pb-1 text-slate-900">I. Breakdown Per Portal</h4>
                    <table class="report-table-clean text-left text-[11px]">
                        <thead class="bg-slate-900 text-white text-[10px] uppercase">
                            <tr>
                                <th class="px-2.5 py-1.5">Portal</th>
                                <th class="px-2.5 py-1.5 text-center">Received</th>
                                <th class="px-2.5 py-1.5 text-center">Resolved</th>
                                <th class="px-2.5 py-1.5 text-center">Pending</th>
                                <th class="px-2.5 py-1.5 text-center">Efficiency</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${portalsForTable.length === 0 ? `
                                <tr><td colspan="5" class="p-3 text-center text-slate-500 italic">No portal records match your filter.</td></tr>
                            ` : portalsForTable.map((p, idx) => {
                                const s = platformStats[p];
                                const eff = s.received > 0 ? Math.round((s.resolved / s.received) * 100) : 0;
                                return `<tr class="${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}">
                                    <td class="px-2.5 py-1.5 font-bold text-slate-900">${escapeHtml(p)}</td>
                                    <td class="px-2.5 py-1.5 text-center font-mono">${s.received}</td>
                                    <td class="px-2.5 py-1.5 text-center font-mono text-emerald-700">${s.resolved}</td>
                                    <td class="px-2.5 py-1.5 text-center font-mono text-rose-700">${s.pending}</td>
                                    <td class="px-2.5 py-1.5 text-center font-mono font-bold text-blue-800">${eff}%</td>
                                </tr>`;
                            }).join('')}
                        </tbody>
                    </table>

                    ${renderGraphPairHtml(graphType, hideEmpty, portalBars, "Portal Volume Bar Graph", "bg-blue-600", portalSlices, totalReceived, "Portal Distribution Pie Graph")}
                </div>
            </div>
            ${buildReportSignatoryFooterHtml(preparedByHtml, cfg, pageCounter++, totalPages, false)}
        </section>
    `;

    const showGroupBar = (graphType === 'all' || graphType === 'bar') && (!hideEmpty || groupBars.some(b => b.value > 0));
    const page2Html = `
        <section class="report-a4-page">
            <div class="space-y-3.5">
                ${buildReportPageHeaderHtml(cfg, startISO, endISO, overallEfficiency, resolvedCount, totalReceived, "Report II — Categorized Breakdown by Concern Division / Group")}

                <div class="space-y-3">
                    <h4 class="font-extrabold text-xs uppercase border-b border-slate-300 pb-1 text-slate-900">II. Categorized Breakdown by Concern Division / Group</h4>
                    ${showGroupBar ? `<div class="grid grid-cols-1 gap-3">${buildBarChart(groupBars, "Concern Group Bar Graph", "bg-teal-600")}</div>` : ''}
                    <div class="space-y-2.5 pt-1">${categorizedBreakdownHtml}</div>
                </div>
            </div>
            ${buildReportSignatoryFooterHtml(preparedByHtml, cfg, pageCounter++, totalPages, false)}
        </section>
    `;

    const pageConcernGroupPieSoloHtml = showGroupPiePage ? `
        <section class="report-a4-page report-page-solo">
            <div class="space-y-4 flex-1 flex flex-col">
                ${buildReportPageHeaderHtml(cfg, startISO, endISO, overallEfficiency, resolvedCount, totalReceived, "Report II — Concern Group Pie Graph")}

                <div class="space-y-3 flex-1 flex flex-col justify-center">
                    <h4 class="font-extrabold text-xs uppercase border-b border-slate-300 pb-1 text-slate-900">Concern Group Pie Graph</h4>
                    ${buildSvgPieChart(groupSlices, totalReceived, "Concern Group Pie Graph", "w-full max-w-none")}
                </div>
            </div>
            ${buildReportSignatoryFooterHtml(preparedByHtml, cfg, pageCounter++, totalPages, false)}
        </section>
    ` : '';

    const page3Html = `
        <section class="report-a4-page">
            <div class="space-y-4">
                ${buildReportPageHeaderHtml(cfg, startISO, endISO, overallEfficiency, resolvedCount, totalReceived, "Report III — Top 10 Concerns Summary")}

                <div class="space-y-3">
                    <h4 class="font-extrabold text-xs uppercase border-b border-slate-300 pb-1 text-slate-900">III. Top 10 Concerns</h4>
                    <table class="report-table-clean text-left text-[11px]">
                        <thead class="bg-slate-900 text-white text-[10px] uppercase">
                            <tr>
                                <th class="px-2 py-1.5 text-center w-12">Rank</th>
                                <th class="px-2 py-1.5">Category</th>
                                <th class="px-2 py-1.5">Group</th>
                                <th class="px-2 py-1.5 text-center">Volume</th>
                                <th class="px-2 py-1.5 text-center">Resolved</th>
                                <th class="px-2 py-1.5 text-center">Pending</th>
                                <th class="px-2 py-1.5 text-center">Share</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${top10Concerns.length === 0 ? `
                                <tr><td colspan="7" class="p-4 text-center text-slate-500 italic">No records found.</td></tr>
                            ` : top10Concerns.map(([cat, st], idx) => {
                                const share = totalReceived > 0 ? ((st.total / totalReceived) * 100).toFixed(1) : "0.0";
                                return `
                                    <tr class="${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}">
                                        <td class="px-2 py-1.5 text-center font-mono font-bold">#${idx + 1}</td>
                                        <td class="px-2 py-1.5 font-bold text-slate-900">${escapeHtml(cat)}</td>
                                        <td class="px-2 py-1.5 text-[10px] text-slate-600">${escapeHtml(getGroupForCategory(cat))}</td>
                                        <td class="px-2 py-1.5 text-center font-mono font-bold text-slate-900">${st.total}</td>
                                        <td class="px-2 py-1.5 text-center font-mono text-emerald-700">${st.resolved}</td>
                                        <td class="px-2 py-1.5 text-center font-mono text-rose-700">${st.pending}</td>
                                        <td class="px-2 py-1.5 text-center font-mono font-bold text-blue-900">${share}%</td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>

                    ${renderGraphPairHtml(graphType, hideEmpty, top10Bars, "Top 10 Concerns Bar Graph", "bg-blue-600", top10Slices, top10Slices.reduce((acc, item) => acc + item.value, 0), "Top 10 Concerns Pie Graph")}
                </div>
            </div>
            ${buildReportSignatoryFooterHtml(preparedByHtml, cfg, pageCounter++, totalPages, false)}
        </section>
    `;

    const page4Html = `
        <section class="report-a4-page">
            <div class="space-y-4">
                ${buildReportPageHeaderHtml(cfg, startISO, endISO, overallEfficiency, resolvedCount, totalReceived, "Report IV — Monthly Tally Breakdown")}

                <div class="space-y-2.5">
                    <h4 class="font-extrabold text-xs uppercase border-b border-slate-300 pb-1 text-slate-900">IV. Monthly Tally Breakdown</h4>
                    <table class="report-table-clean text-left text-[11px]">
                        <thead class="bg-slate-900 text-white text-[10px] uppercase">
                            <tr>
                                <th class="px-2.5 py-1.5">Category</th>
                                ${coveredMonths.map(m => `<th class="px-2.5 py-1.5 text-center">${escapeHtml(m.label)}</th>`).join('')}
                                <th class="px-2.5 py-1.5 text-center bg-slate-800">Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${matrixCategories.length === 0 ? `
                                <tr><td colspan="${coveredMonths.length + 2}" class="p-4 text-center text-slate-500 italic">No monthly records found for the selected period.</td></tr>
                            ` : matrixCategories.map(([cat, mc], idx) => `
                                <tr class="${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}">
                                    <td class="px-2.5 py-1.5 font-bold text-slate-900">${escapeHtml(cat)}</td>
                                    ${coveredMonths.map(m => `<td class="px-2.5 py-1.5 text-center font-mono">${mc[m.key] || 0}</td>`).join('')}
                                    <td class="px-2.5 py-1.5 text-center font-mono font-extrabold text-blue-900 bg-blue-50">${mc.total}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
            ${buildReportSignatoryFooterHtml(preparedByHtml, cfg, pageCounter++, totalPages, true)}
        </section>
    `;

    document.getElementById('reportResultsContainer').innerHTML = `
        <div id="printableReportDocument" class="space-y-6">
            ${page1Html}
            ${page2Html}
            ${pageConcernGroupPieSoloHtml}
            ${page3Html}
            ${page4Html}
        </div>
    `;
}

function buildReportSignatoryFooterHtml(preparedByHtml, cfg, pageNum, totalPages, includePreparedBy = false) {
    const preparedBlock = includePreparedBy ? `
        <div>
            <p class="text-slate-600 font-semibold text-[11px]">Prepared by:</p>
            <div>${preparedByHtml}</div>
        </div>
    ` : `<div></div>`;

    const notedBlock = includePreparedBy ? `
        <div>
            <p class="text-slate-600 font-semibold text-[11px]">Noted / Approved by:</p>
            <div class="mt-6">
                <p class="font-bold uppercase text-slate-900 text-[11px]">${escapeHtml(cfg.notedName || 'MARY MAY M. JACOB')}</p>
                <p class="text-[10px] text-slate-600">${escapeHtml(cfg.notedDesig || 'Head, LTO COMMS/CPAO')}</p>
            </div>
        </div>
    ` : `<div></div>`;

    return `
        <div class="pt-4 mt-4 border-t border-slate-300 report-card-avoid-break">
            <div class="grid grid-cols-2 gap-8 text-xs">
                ${preparedBlock}
                ${notedBlock}
            </div>
            <div class="mt-3 pt-2 border-t border-slate-200 flex items-center justify-between text-[9.5px] text-slate-500 font-mono">
                <span>LTO CENTRAL PUBLIC ASSISTANCE OFFICE (CPAO)</span>
                <span>Page ${pageNum} of ${totalPages}</span>
            </div>
        </div>
    `;
}

function printReport() {
    if (!canUserGenerateReports()) return;
    if (!document.getElementById('printableReportDocument')) generateReport();
    if (isReportPreviewEditing) setReportPreviewEditState(false);
    document.body.classList.add('printing-report');
    setTimeout(() => {
        window.print();
        setTimeout(() => document.body.classList.remove('printing-report'), 400);
    }, 150);
}

window.addEventListener("DOMContentLoaded", () => {
    const btnLog = document.getElementById("btnLogTicket");
    if (btnLog) {
        btnLog.addEventListener("click", () => openTicketModal(null));
    }
    initSystem();
});

/* ============================================================================
   GLOBAL KEYBOARD SHORTCUTS (ESC TO CLOSE WINDOW & PRESERVE LAST ENTRY)
   ============================================================================ */
function isModalVisible(modalId) {
    const el = document.getElementById(modalId);
    if (!el) return false;
    return el.style.display === 'flex' || el.style.display === 'block';
}

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        const globalPicker = document.getElementById('globalSystemDatePickerPopup');
        if (globalPicker && !globalPicker.classList.contains('hidden')) {
            e.preventDefault();
            closeGlobalSystemDatePicker();
            return;
        }
        const calcPicker = document.getElementById('calcSystemDatePickerPopup');
        if (calcPicker && !calcPicker.classList.contains('hidden')) {
            e.preventDefault();
            closeCalcSystemDatePicker();
            return;
        }

        const catDropdown = document.getElementById('categoryDropdownList');
        if (catDropdown && !catDropdown.classList.contains('hidden')) {
            e.preventDefault();
            catDropdown.classList.add('hidden');
            return;
        }

        if (isModalVisible('systemModal')) {
            e.preventDefault();
            closeSystemModal();
            return;
        }
        if (isModalVisible('duplicateWarningModal')) {
            e.preventDefault();
            cancelDuplicateTicketSave();
            return;
        }
        if (isModalVisible('endorsePreviewModal')) {
            e.preventDefault();
            closeEndorsePreviewModal();
            return;
        }
        if (isModalVisible('endorseModal')) {
            e.preventDefault();
            closeEndorseModal(false);
            return;
        }
        if (isModalVisible('ticketModal')) {
            e.preventDefault();
            closeTicketModal(false);
            return;
        }
        if (isModalVisible('officialModal')) {
            e.preventDefault();
            closeOfficialModal();
            return;
        }
        if (isModalVisible('directoryModal')) {
            e.preventDefault();
            closeDirectoryModal();
            return;
        }
        if (isModalVisible('settingItemModal')) {
            e.preventDefault();
            closeSettingModal();
            return;
        }
        if (isModalVisible('reportConfigModal')) {
            e.preventDefault();
            closeReportConfigModal();
            return;
        }
        if (isModalVisible('userModal')) {
            e.preventDefault();
            closeUserModal();
            return;
        }
        if (isModalVisible('myAccountModal')) {
            e.preventDefault();
            closeMyAccountModal();
            return;
        }
        if (isModalVisible('deleteLogsModal')) {
            e.preventDefault();
            closeDeleteLogsModal();
            return;
        }
        if (isModalVisible('logoutModal')) {
            e.preventDefault();
            closeLogoutModal();
            return;
        }
    }

    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        const activeModals = [
            'ticketModal',
            'endorseModal',
            'officialModal',
            'directoryModal',
            'settingItemModal',
            'userModal',
            'myAccountModal'
        ];
        for (const mId of activeModals) {
            if (isModalVisible(mId)) {
                const form = document.querySelector(`#${mId} form`);
                if (form) {
                    e.preventDefault();
                    if (typeof form.requestSubmit === 'function') form.requestSubmit();
                    else form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
                }
                return;
            }
        }
    }
});


function loadColumnLabelsToUI() {
    const cols = getColumnLabelsConfig();
    const map = {
        cfgColReceived: cols.received,
        cfgColAdminNo: cols.adminNo,
        cfgColPlatform: cols.platform,
        cfgColReferralNo: cols.referralNo,
        cfgColDateReceived: cols.dateReceived,
        cfgColCategory: cols.category,
        cfgColTicketType: cols.ticketType,
        cfgColComplainantName: cols.complainantName,
        cfgColTicketDetails: cols.ticketDetails,
        cfgColResponseDetails: cols.responseDetails,
        cfgColActionTaken: cols.actionTaken,
        cfgColStatus: cols.status,
        cfgColRemarks: cols.remarks,
        cfgGraphTotalLabel: cols.graphTotalLabel,
        cfgGraphPlatformTitle: cols.graphPlatformTitle,
        cfgGraphCategoryTitle: cols.graphCategoryTitle
    };
    Object.entries(map).forEach(([id, val]) => {
        const el = document.getElementById(id);
        if (el && document.activeElement !== el) {
            el.value = val || '';
        }
    });
}

async function saveColumnLabelsConfig() {
    if (!isSuperAdmin() && !isAdminTL()) {
        showSystemAlert("Access Denied", "Only Super Admin and AdminTL can modify column names.", "🔒");
        return;
    }
    const valOrDef = (id, def) => {
        const el = document.getElementById(id);
        const txt = el ? el.value.trim() : '';
        return txt || def;
    };
    AppState.settings.columnLabels = {
        received: valOrDef('cfgColReceived', DEFAULT_COLUMN_LABELS.received),
        adminNo: valOrDef('cfgColAdminNo', DEFAULT_COLUMN_LABELS.adminNo),
        platform: valOrDef('cfgColPlatform', DEFAULT_COLUMN_LABELS.platform),
        referralNo: valOrDef('cfgColReferralNo', DEFAULT_COLUMN_LABELS.referralNo),
        dateReceived: valOrDef('cfgColDateReceived', DEFAULT_COLUMN_LABELS.dateReceived),
        category: valOrDef('cfgColCategory', DEFAULT_COLUMN_LABELS.category),
        ticketType: valOrDef('cfgColTicketType', DEFAULT_COLUMN_LABELS.ticketType),
        complainantName: valOrDef('cfgColComplainantName', DEFAULT_COLUMN_LABELS.complainantName),
        ticketDetails: valOrDef('cfgColTicketDetails', DEFAULT_COLUMN_LABELS.ticketDetails),
        responseDetails: valOrDef('cfgColResponseDetails', DEFAULT_COLUMN_LABELS.responseDetails),
        actionTaken: valOrDef('cfgColActionTaken', DEFAULT_COLUMN_LABELS.actionTaken),
        status: valOrDef('cfgColStatus', DEFAULT_COLUMN_LABELS.status),
        remarks: valOrDef('cfgColRemarks', DEFAULT_COLUMN_LABELS.remarks),
        graphTotalLabel: valOrDef('cfgGraphTotalLabel', DEFAULT_COLUMN_LABELS.graphTotalLabel),
        graphPlatformTitle: valOrDef('cfgGraphPlatformTitle', DEFAULT_COLUMN_LABELS.graphPlatformTitle),
        graphCategoryTitle: valOrDef('cfgGraphCategoryTitle', DEFAULT_COLUMN_LABELS.graphCategoryTitle)
    };
    persistLocalSettingsCache();
    renderTableHeadersAndColumns();
    renderTable();
    updateKPIs();
    loadColumnLabelsToUI();
    await saveAllSettingsToCloud(false);
    showToast("Table and graph column names saved & synced.");
}

function resetColumnLabelsDefault() {
    if (!isSuperAdmin() && !isAdminTL()) return;
    AppState.settings.columnLabels = { ...DEFAULT_COLUMN_LABELS };
    persistLocalSettingsCache();
    loadColumnLabelsToUI();
    renderTableHeadersAndColumns();
    renderTable();
    updateKPIs();
    saveAllSettingsToCloud(false);
    showToast("Column names reset to default.");
}

function parseTicketDateObj(dateStr) {
    const clean = formatCleanDate(dateStr || '');
    if (!clean) return null;
    const parts = clean.split('/');
    if (parts.length !== 3) return null;
    const m = parseInt(parts[0], 10) - 1;
    const d = parseInt(parts[1], 10);
    const y = parseInt(parts[2], 10);
    const dt = new Date(y, m, d);
    return isNaN(dt.getTime()) ? null : dt;
}

function getPeriodBounds(period, refDate = new Date()) {
    const y = refDate.getFullYear();
    const m = refDate.getMonth();
    const d = refDate.getDate();
    const startOfToday = new Date(y, m, d, 0, 0, 0, 0);
    const endOfToday = new Date(y, m, d, 23, 59, 59, 999);

    if (period === 'daily') {
        return { start: startOfToday, end: endOfToday, label: `Daily (${isoToMMDDYYYY(getTodayISO())})` };
    }
    if (period === 'weekly') {
        const dayOfWeek = startOfToday.getDay(); // 0=Sun..6=Sat
        const diffToMon = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        const weekStart = new Date(y, m, d + diffToMon, 0, 0, 0, 0);
        const weekEnd = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + 6, 23, 59, 59, 999);
        return { start: weekStart, end: weekEnd, label: "Weekly (Mon – Sun)" };
    }
    if (period === 'monthly') {
        const monthStart = new Date(y, m, 1, 0, 0, 0, 0);
        const monthEnd = new Date(y, m + 1, 0, 23, 59, 59, 999);
        return { start: monthStart, end: monthEnd, label: `Monthly (${refDate.toLocaleString('en-US', { month: 'long', year: 'numeric' })})` };
    }
    const yearStart = new Date(y, 0, 1, 0, 0, 0, 0);
    const yearEnd = new Date(y, 11, 31, 23, 59, 59, 999);
    return { start: yearStart, end: yearEnd, label: `Annual (${y})` };
}

function isTicketInBounds(ticket, bounds) {
    const dt = parseTicketDateObj(ticket.dateReceived);
    if (!dt) return false;
    return dt >= bounds.start && dt <= bounds.end;
}

function computePeriodStats(tickets, period) {
    const bounds = getPeriodBounds(period);
    const list = tickets.filter(t => isTicketInBounds(t, bounds));
    const total = list.length;
    const answered = list.filter(t => String(t.status || '').toLowerCase() === 'closed').length;
    const pending = total - answered;
    const rate = total > 0 ? Math.round((answered / total) * 100) : 0;
    return { total, answered, pending, rate, label: bounds.label, list };
}

function renderSupervisorStats() {
    const tbody = document.getElementById('supervisorStatsTableBody');
    if (!tbody) return;

    const period = document.getElementById('supPeriodSelect')?.value || 'daily';
    const tickets = Array.isArray(AppState.tickets) ? AppState.tickets : [];

    const dailyStat = computePeriodStats(tickets, 'daily');
    const weeklyStat = computePeriodStats(tickets, 'weekly');
    const monthlyStat = computePeriodStats(tickets, 'monthly');
    const annualStat = computePeriodStats(tickets, 'annual');

    const selectedStat = period === 'weekly' ? weeklyStat
        : period === 'monthly' ? monthlyStat
        : period === 'annual' ? annualStat
        : dailyStat;

    const adminKeys = new Set();
    (AppState.users || []).forEach(u => {
        const label = (u.adminNo || deriveOperatorAdminNo(u) || u.name || u.username || '').trim();
        if (label) adminKeys.add(label);
    });
    tickets.forEach(t => {
        const label = String(t.adminNo || '').trim();
        if (label) adminKeys.add(label);
    });

    const sortedAdmins = Array.from(adminKeys).sort((a, b) => a.localeCompare(b));

    const setElText = (id, txt) => {
        const el = document.getElementById(id);
        if (el) el.textContent = txt;
    };

    setElText('supKpiTotal', selectedStat.total);
    setElText('supKpiAnswered', selectedStat.answered);
    setElText('supKpiPending', selectedStat.pending);
    setElText('supKpiRate', `${selectedStat.rate}%`);
    setElText('supKpiAdmins', sortedAdmins.length);

    setElText('supSummaryDaily', `${dailyStat.total} Logs • ${dailyStat.rate}% Rate (${dailyStat.answered} Answered)`);
    setElText('supSummaryWeekly', `${weeklyStat.total} Logs • ${weeklyStat.rate}% Rate (${weeklyStat.answered} Answered)`);
    setElText('supSummaryMonthly', `${monthlyStat.total} Logs • ${monthlyStat.rate}% Rate (${monthlyStat.answered} Answered)`);
    setElText('supSummaryAnnual', `${annualStat.total} Logs • ${annualStat.rate}% Rate (${annualStat.answered} Answered)`);
    setElText('supPeriodLabel', selectedStat.label);

    const dBounds = getPeriodBounds('daily');
    const wBounds = getPeriodBounds('weekly');
    const mBounds = getPeriodBounds('monthly');
    const aBounds = getPeriodBounds('annual');
    const selBounds = getPeriodBounds(period);

    tbody.innerHTML = '';
    if (sortedAdmins.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" class="text-center py-8 text-slate-400 text-xs">No admin log statistics available yet.</td></tr>`;
        return;
    }

    sortedAdmins.forEach(adminLabel => {
        const targetLower = adminLabel.toLowerCase();
        const adminTickets = tickets.filter(t => String(t.adminNo || '').trim().toLowerCase() === targetLower);

        const dCount = adminTickets.filter(t => isTicketInBounds(t, dBounds)).length;
        const wCount = adminTickets.filter(t => isTicketInBounds(t, wBounds)).length;
        const mCount = adminTickets.filter(t => isTicketInBounds(t, mBounds)).length;
        const aCount = adminTickets.filter(t => isTicketInBounds(t, aBounds)).length;

        const selTickets = adminTickets.filter(t => isTicketInBounds(t, selBounds));
        const selAnswered = selTickets.filter(t => String(t.status || '').toLowerCase() === 'closed').length;
        const selPending = selTickets.length - selAnswered;
        const selRate = selTickets.length > 0 ? Math.round((selAnswered / selTickets.length) * 100) : 0;

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="font-bold text-white">${escapeHtml(adminLabel)}</td>
            <td class="text-center font-mono text-slate-200">${dCount}</td>
            <td class="text-center font-mono text-slate-200">${wCount}</td>
            <td class="text-center font-mono text-slate-200">${mCount}</td>
            <td class="text-center font-mono text-slate-200">${aCount}</td>
            <td class="text-center font-mono font-bold text-emerald-400">${selAnswered}</td>
            <td class="text-center font-mono font-bold text-amber-400">${selPending}</td>
            <td class="text-center font-mono font-extrabold text-sky-400">${selRate}%</td>
        `;
        tbody.appendChild(tr);
    });
}
