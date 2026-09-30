const API_BASE_URL = "http://localhost:3000/api";

const byId = (id) => document.getElementById(id);


/* =========================
   AUTH HELPERS
========================= */

function getAuthHeaders() {
    return {
        Authorization: `Bearer ${localStorage.getItem("token")}`
    };
}

function getJsonAuthHeaders() {
    return {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`
    };
}

function handleUnauthorized(response) {
    if (response.status !== 401) {
        return false;
    }

    localStorage.removeItem("token");
    window.location.href = "login.html";

    return true;
}

function requireAuth() {
    const token = localStorage.getItem("token");

    if (token) {
        return true;
    }

    window.location.href = "login.html";
    return false;
}


/* =========================
   HELPERS
========================= */

function formatDate(value) {
    if (!value) {
        return "-";
    }

    return new Date(value).toLocaleDateString(
        "en-US",
        {
            month: "short",
            day: "numeric",
            year: "numeric"
        }
    );
}

function formatTime(value) {
    if (!value) {
        return "-";
    }

    return new Date(value).toLocaleTimeString(
        "en-US",
        {
            hour: "2-digit",
            minute: "2-digit"
        }
    );
}

function formatDateTime(value) {
    if (!value) {
        return "-";
    }

    return `${formatDate(value)} • ${formatTime(value)}`;
}

function getPriorityClass(priority) {
    return `priority-${(priority || "Medium").toLowerCase()}`;
}

function getStatusClass(status) {
    if (!status) {
        return "status-default";
    }

    return `status-${status
        .toLowerCase()
        .replaceAll(" ", "-")}`;
}

function isActionOverdue(item) {
    if (!item.Deadline) {
        return false;
    }

    if (
        item.Status === "Completed" ||
        item.Status === "Cancelled"
    ) {
        return false;
    }

    const deadline = new Date(item.Deadline);
    const today = new Date();

    deadline.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);

    return deadline < today;
}

function getDecisionProgress(item) {
    const total =
        Number(item.TotalActions) || 0;

    const completed =
        Number(item.CompletedActions) || 0;

    if (total === 0) {
        return 0;
    }

    return Math.round(
        (completed / total) * 100
    );
}

function getInitials(name) {
    if (!name) {
        return "?";
    }

    return name
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map(
            (part) =>
                part.charAt(0).toUpperCase()
        )
        .join("");
}

function getMeetingIdFromUrl() {
    const params =
        new URLSearchParams(
            window.location.search
        );

    const meetingId =
        Number(params.get("id"));

    if (
        !Number.isInteger(meetingId) ||
        meetingId <= 0
    ) {
        return null;
    }

    return meetingId;
}


/* =========================
   LOGIN
========================= */

const loginForm =
    byId("loginForm");

const loginMessage =
    byId("loginMessage");

if (loginForm) {
    loginForm.addEventListener(
        "submit",
        async (event) => {
            event.preventDefault();

            const email =
                byId("email")
                    .value
                    .trim();

            const password =
                byId("password")
                    .value;

            loginMessage.textContent =
                "Logging in...";

            try {
                const response =
                    await fetch(
                        `${API_BASE_URL}/auth/login`,
                        {
                            method: "POST",

                            headers: {
                                "Content-Type":
                                    "application/json"
                            },

                            body:
                                JSON.stringify({
                                    email,
                                    password
                                })
                        }
                    );

                const data =
                    await response.json();

                if (!response.ok) {
                    loginMessage.textContent =
                        data.message ||
                        "Login failed.";

                    return;
                }

                localStorage.setItem(
                    "token",
                    data.token
                );

                window.location.href =
                    "dashboard.html";

            } catch (error) {
                console.error(
                    "Login error:",
                    error
                );

                loginMessage.textContent =
                    "Could not connect to the server.";
            }
        }
    );
}


/* =========================
   REGISTER
========================= */

const registerForm =
    byId("registerForm");

const registerMessage =
    byId("registerMessage");

if (registerForm) {
    registerForm.addEventListener(
        "submit",
        async (event) => {
            event.preventDefault();

            const fullName =
                byId("registerFullName")
                    .value
                    .trim();

            const email =
                byId("registerEmail")
                    .value
                    .trim();

            const password =
                byId("registerPassword")
                    .value;

            const confirmPassword =
                byId(
                    "registerConfirmPassword"
                ).value;

            if (
                !fullName ||
                !email ||
                !password ||
                !confirmPassword
            ) {
                registerMessage.textContent =
                    "Please complete all fields.";

                return;
            }

            if (password.length < 6) {
                registerMessage.textContent =
                    "Password must be at least 6 characters.";

                return;
            }

            if (
                password !==
                confirmPassword
            ) {
                registerMessage.textContent =
                    "Passwords do not match.";

                return;
            }

            registerMessage.textContent =
                "Creating account...";

            try {
                const response =
                    await fetch(
                        `${API_BASE_URL}/auth/register`,
                        {
                            method: "POST",

                            headers: {
                                "Content-Type":
                                    "application/json"
                            },

                            body:
                                JSON.stringify({
                                    fullName,
                                    email,
                                    password
                                })
                        }
                    );

                const data =
                    await response.json();

                if (!response.ok) {
                    registerMessage.textContent =
                        data.message ||
                        "Registration failed.";

                    return;
                }

                registerMessage.textContent =
                    "Account created successfully.";

                registerForm.reset();

                setTimeout(
                    () => {
                        window.location.href =
                            "login.html";
                    },
                    1000
                );

            } catch (error) {
                console.error(
                    "Register error:",
                    error
                );

                registerMessage.textContent =
                    "Could not connect to the server.";
            }
        }
    );
}


/* =========================
   LOGOUT
========================= */

const logoutButton =
    byId("logoutButton");

if (logoutButton) {
    logoutButton.addEventListener(
        "click",
        () => {
            localStorage.removeItem(
                "token"
            );

            window.location.href =
                "login.html";
        }
    );
}


/* =========================
   DASHBOARD STATS
========================= */

async function loadDashboardStats() {
    try {
        const response =
            await fetch(
                `${API_BASE_URL}/dashboard/stats`,
                {
                    headers:
                        getAuthHeaders()
                }
            );

        if (
            handleUnauthorized(
                response
            )
        ) {
            return;
        }

        const data =
            await response.json();

        if (!response.ok) {
            console.error(data);
            return;
        }

        if (byId("meetingsThisMonth")) {
            byId("meetingsThisMonth")
                .textContent =
                data.MeetingsThisMonth;
        }

        if (byId("openDecisions")) {
            byId("openDecisions")
                .textContent =
                data.OpenDecisions;
        }

        if (
            byId(
                "implementedDecisions"
            )
        ) {
            byId(
                "implementedDecisions"
            ).textContent =
                data.ImplementedDecisions;
        }

        if (byId("openActions")) {
            byId("openActions")
                .textContent =
                data.OpenActions;
        }

        if (byId("overdueActions")) {
            byId("overdueActions")
                .textContent =
                data.OverdueActions;
        }

        if (
            byId(
                "completedActions"
            )
        ) {
            byId(
                "completedActions"
            ).textContent =
                data.CompletedActions;
        }

    } catch (error) {
        console.error(
            "Dashboard stats error:",
            error
        );
    }
}


/* =========================
   DASHBOARD ACTION LISTS
========================= */

function renderActionList(
    elementId,
    items
) {
    const container =
        byId(elementId);

    if (!container) {
        return;
    }

    if (!items || items.length === 0) {
        container.innerHTML = `
            <p class="empty-message">
                No records found.
            </p>
        `;

        return;
    }

    container.innerHTML =
        items
            .map((item) => {
                const progress =
                    Number(
                        item.Progress
                    ) || 0;

                const overdue =
                    isActionOverdue(
                        item
                    );

                return `
                    <div class="action-summary-card">

                        <div class="action-card-header">

                            <strong class="action-title">
                                ${item.Title}
                            </strong>

                            <div class="action-badges">

                                ${
                                    overdue
                                        ? `
                                            <span class="badge overdue-badge">
                                                OVERDUE
                                            </span>
                                        `
                                        : ""
                                }

                                <span class="badge ${getPriorityClass(item.Priority)}">
                                    ${item.Priority || "Medium"}
                                </span>

                            </div>

                        </div>

                        <div class="action-meta">

                            <span>
                                👤 ${item.ResponsiblePerson || "Unassigned"}
                            </span>

                            <span>
                                📅 ${formatDate(item.Deadline)}
                            </span>

                        </div>

                        <div class="action-status-row">

                            <span class="status-badge ${getStatusClass(item.Status)}">
                                ${item.Status || "To Do"}
                            </span>

                            <span class="progress-percentage">
                                ${progress}%
                            </span>

                        </div>

                        <div class="progress-track">

                            <div
                                class="progress-fill"
                                style="width: ${progress}%"
                            ></div>

                        </div>

                    </div>
                `;
            })
            .join("");
}


/* =========================
   DASHBOARD MEETINGS
========================= */

function renderMeetingList(items) {
    const container =
        byId(
            "upcomingMeetingsList"
        );

    if (!container) {
        return;
    }

    if (!items || items.length === 0) {
        container.innerHTML = `
            <p class="empty-message">
                No upcoming meetings.
            </p>
        `;

        return;
    }

    container.innerHTML =
        items
            .map((item) => {
                const date =
                    new Date(
                        item.MeetingDate
                    );

                return `
                    <div class="meeting-summary-card">

                        <div class="meeting-date-box">

                            <span class="meeting-month">
                                ${date
                                    .toLocaleDateString(
                                        "en-US",
                                        {
                                            month:
                                                "short"
                                        }
                                    )
                                    .toUpperCase()}
                            </span>

                            <strong class="meeting-day">
                                ${date.getDate()}
                            </strong>

                        </div>

                        <div class="meeting-info">

                            <strong class="meeting-title">
                                ${item.Title}
                            </strong>

                            <div class="meeting-meta">

                                <span>
                                    🕒 ${formatTime(item.MeetingDate)}
                                </span>

                                <span>
                                    📍 ${item.Location || "No location"}
                                </span>

                            </div>

                        </div>

                        <span class="meeting-badge">
                            UPCOMING
                        </span>

                    </div>
                `;
            })
            .join("");
}


/* =========================
   DASHBOARD DECISIONS
========================= */

function renderDecisionList(
    elementId,
    items
) {
    const container =
        byId(elementId);

    if (!container) {
        return;
    }

    if (!items || items.length === 0) {
        container.innerHTML = `
            <p class="empty-message">
                No records found.
            </p>
        `;

        return;
    }

    if (
        elementId ===
        "waitingDecisionsList"
    ) {
        container.innerHTML =
            items
                .map(
                    (item) => `
                        <div class="waiting-decision-card">

                            <div class="decision-card-top">

                                <div>

                                    <span class="waiting-badge">
                                        WAITING FOR ACTION
                                    </span>

                                    <strong class="waiting-decision-title">
                                        ${item.Title}
                                    </strong>

                                </div>

                            </div>

                            <div class="decision-card-meta">

                                <span class="decision-status">
                                    ${item.ImplementationStatus}
                                </span>

                                <span>
                                    📅 Created ${formatDate(item.CreatedAt)}
                                </span>

                            </div>

                        </div>
                    `
                )
                .join("");
    }

    if (
        elementId ===
        "completedDecisionsList"
    ) {
        container.innerHTML =
            items
                .map(
                    (item) => `
                        <div class="completed-decision-card">

                            <span class="completed-badge">
                                ✓ IMPLEMENTED
                            </span>

                            <strong class="completed-decision-title">
                                ${item.Title}
                            </strong>

                            <div class="completed-result">

                                <span class="completed-result-label">
                                    Final Result
                                </span>

                                <p>
                                    ${
                                        item.FinalResult ||
                                        "No final result added."
                                    }
                                </p>

                            </div>

                        </div>
                    `
                )
                .join("");
    }
}


/* =========================
   DASHBOARD OVERVIEW
========================= */

async function loadDashboardOverview() {
    try {
        const response =
            await fetch(
                `${API_BASE_URL}/dashboard/overview`,
                {
                    headers:
                        getAuthHeaders()
                }
            );

        if (
            handleUnauthorized(
                response
            )
        ) {
            return;
        }

        const data =
            await response.json();

        if (!response.ok) {
            console.error(data);
            return;
        }

        renderActionList(
            "overdueActionsList",
            data.overdueActions
        );

        renderActionList(
            "upcomingDeadlinesList",
            data.upcomingDeadlines
        );

        renderMeetingList(
            data.upcomingMeetings
        );

        renderDecisionList(
            "waitingDecisionsList",
            data.decisionsWaitingForAction
        );

        renderDecisionList(
            "completedDecisionsList",
            data.recentlyCompletedDecisions
        );

    } catch (error) {
        console.error(
            "Dashboard overview error:",
            error
        );
    }
}


/* =========================
   CHARTS
========================= */

function getChartColors(labels) {
    const colorMap = {
        "Not Started": "#94a3b8",
        "In Progress": "#3b82f6",
        "Partially Implemented": "#8b5cf6",
        "Implemented": "#10b981",
        "Not Implemented": "#ef4444",

        "To Do": "#94a3b8",
        "Blocked": "#f59e0b",
        "Completed": "#10b981",
        "Cancelled": "#64748b",

        "Low": "#22c55e",
        "Medium": "#06b6d4",
        "High": "#f59e0b",
        "Critical": "#ef4444"
    };

    return labels.map(
        (label) =>
            colorMap[label] ||
            "#6366f1"
    );
}

function createChart(
    canvasId,
    type,
    items
) {
    const canvas =
        byId(canvasId);

    if (
        !canvas ||
        !items ||
        typeof Chart === "undefined"
    ) {
        return;
    }

    const labels =
        items.map(
            (item) =>
                item.label
        );

    const values =
        items.map(
            (item) =>
                item.value
        );

    const colors =
        getChartColors(
            labels
        );

    const isBarChart =
        type === "bar";

    new Chart(
        canvas,
        {
            type,

            data: {
                labels,

                datasets: [
                    {
                        label:
                            "Count",

                        data:
                            values,

                        backgroundColor:
                            colors,

                        borderColor:
                            isBarChart
                                ? colors
                                : "#ffffff",

                        borderWidth:
                            isBarChart
                                ? 0
                                : 3,

                        borderRadius:
                            isBarChart
                                ? 9
                                : 0
                    }
                ]
            },

            options: {
                responsive:
                    true,

                maintainAspectRatio:
                    false,

                plugins: {
                    legend: {
                        position:
                            "bottom"
                    }
                },

                scales:
                    isBarChart
                        ? {
                            y: {
                                beginAtZero:
                                    true,

                                ticks: {
                                    precision:
                                        0
                                }
                            }
                        }
                        : undefined,

                cutout:
                    type ===
                    "doughnut"
                        ? "66%"
                        : undefined
            }
        }
    );
}

async function loadDashboardCharts() {
    try {
        const response =
            await fetch(
                `${API_BASE_URL}/dashboard/charts`,
                {
                    headers:
                        getAuthHeaders()
                }
            );

        if (
            handleUnauthorized(
                response
            )
        ) {
            return;
        }

        const data =
            await response.json();

        if (!response.ok) {
            console.error(data);
            return;
        }

        createChart(
            "decisionChart",
            "doughnut",
            data.decisionImplementationStatus
        );

        createChart(
            "actionStatusChart",
            "bar",
            data.actionStatusDistribution
        );

        createChart(
            "priorityChart",
            "pie",
            data.priorityDistribution
        );

    } catch (error) {
        console.error(
            "Dashboard chart error:",
            error
        );
    }
}


/* =========================
   MEETINGS PAGE
========================= */

const meetingsList =
    byId("meetingsList");

const meetingFormSection =
    byId("meetingFormSection");

const openMeetingFormButton =
    byId(
        "openMeetingFormButton"
    );

const closeMeetingFormButton =
    byId(
        "closeMeetingFormButton"
    );

const cancelMeetingButton =
    byId(
        "cancelMeetingButton"
    );

const meetingForm =
    byId("meetingForm");

const meetingMessage =
    byId("meetingMessage");


function openMeetingForm() {
    if (!meetingFormSection) {
        return;
    }

    meetingFormSection
        .classList
        .remove("hidden");
}

function closeMeetingForm() {
    if (!meetingFormSection) {
        return;
    }

    meetingFormSection
        .classList
        .add("hidden");

    if (meetingForm) {
        meetingForm.reset();
    }

    if (meetingMessage) {
        meetingMessage.textContent =
            "";
    }
}

if (openMeetingFormButton) {
    openMeetingFormButton
        .addEventListener(
            "click",
            openMeetingForm
        );
}

if (closeMeetingFormButton) {
    closeMeetingFormButton
        .addEventListener(
            "click",
            closeMeetingForm
        );
}

if (cancelMeetingButton) {
    cancelMeetingButton
        .addEventListener(
            "click",
            closeMeetingForm
        );
}


function renderMeetingsPage(items) {
    if (!meetingsList) {
        return;
    }

    if (!items || items.length === 0) {
        meetingsList.innerHTML = `
            <p class="empty-message">
                No meetings found.
            </p>
        `;

        return;
    }

    meetingsList.innerHTML =
        items
            .map((item) => {
                const date =
                    new Date(
                        item.MeetingDate
                    );

                return `
                    <div class="meeting-page-card">

                        <div class="meeting-page-date">

                            <span>
                                ${date
                                    .toLocaleDateString(
                                        "en-US",
                                        {
                                            month:
                                                "short"
                                        }
                                    )
                                    .toUpperCase()}
                            </span>

                            <strong>
                                ${date.getDate()}
                            </strong>

                        </div>

                        <div class="meeting-page-info">

                            <h3>
                                ${item.Title}
                            </h3>

                            <div class="meeting-page-meta">

                                <span>
                                    🕒 ${formatTime(item.MeetingDate)}
                                </span>

                                <span>
                                    📍 ${item.Location || "No location"}
                                </span>

                                <span>
                                    👥 ${item.ParticipantCount || 0}
                                    Participants
                                </span>

                                <span>
                                    ✓ ${item.DecisionCount || 0}
                                    Decisions
                                </span>

                            </div>

                            ${
                                item.Description
                                    ? `
                                        <p class="meeting-page-description">
                                            ${item.Description}
                                        </p>
                                    `
                                    : ""
                            }

                        </div>

                        <div class="meeting-page-actions">

                            <button
                                type="button"
                                class="small-action-button primary view-meeting-button"
                                data-meeting-id="${item.Id}"
                            >
                                View
                            </button>

                        </div>

                    </div>
                `;
            })
            .join("");
}


if (meetingsList) {
    meetingsList.addEventListener(
        "click",
        (event) => {
            const button =
                event.target.closest(
                    ".view-meeting-button"
                );

            if (!button) {
                return;
            }

            window.location.href =
                `meeting-detail.html?id=${button.dataset.meetingId}`;
        }
    );
}


async function loadMeetings() {
    if (!meetingsList) {
        return;
    }

    meetingsList.innerHTML = `
        <p class="empty-message">
            Loading meetings...
        </p>
    `;

    try {
        const response =
            await fetch(
                `${API_BASE_URL}/meetings`,
                {
                    headers:
                        getAuthHeaders()
                }
            );

        if (
            handleUnauthorized(
                response
            )
        ) {
            return;
        }

        const data =
            await response.json();

        if (!response.ok) {
            meetingsList.innerHTML = `
                <p class="empty-message">
                    Meetings could not be loaded.
                </p>
            `;

            return;
        }

        renderMeetingsPage(
            data.meetings
        );

    } catch (error) {
        console.error(
            "Meetings load error:",
            error
        );

        meetingsList.innerHTML = `
            <p class="empty-message">
                Could not connect to the server.
            </p>
        `;
    }
}


if (meetingForm) {
    meetingForm.addEventListener(
        "submit",
        async (event) => {
            event.preventDefault();

            const title =
                byId("meetingTitle")
                    .value
                    .trim();

            const meetingDate =
                byId("meetingDate")
                    .value;

            const location =
                byId("meetingLocation")
                    .value
                    .trim();

            const description =
                byId(
                    "meetingDescription"
                )
                    .value
                    .trim();

            const notes =
                byId("meetingNotes")
                    .value
                    .trim();

            if (
                !title ||
                !meetingDate
            ) {
                meetingMessage.textContent =
                    "Meeting title and date are required.";

                return;
            }

            meetingMessage.textContent =
                "Creating meeting...";

            try {
                const response =
                    await fetch(
                        `${API_BASE_URL}/meetings`,
                        {
                            method:
                                "POST",

                            headers:
                                getJsonAuthHeaders(),

                            body:
                                JSON.stringify({
                                    title,
                                    meetingDate,
                                    location,
                                    description,
                                    notes
                                })
                        }
                    );

                if (
                    handleUnauthorized(
                        response
                    )
                ) {
                    return;
                }

                const data =
                    await response.json();

                if (!response.ok) {
                    meetingMessage.textContent =
                        data.message ||
                        "Meeting could not be created.";

                    return;
                }

                meetingMessage.textContent =
                    "Meeting created successfully.";

                meetingForm.reset();

                await loadMeetings();

                setTimeout(
                    closeMeetingForm,
                    700
                );

            } catch (error) {
                console.error(
                    "Create meeting error:",
                    error
                );

                meetingMessage.textContent =
                    "Could not connect to the server.";
            }
        }
    );
}


/* =========================
   MEETING DETAIL
========================= */

const meetingDetailMessage =
    byId(
        "meetingDetailMessage"
    );

const meetingDetailContent =
    byId(
        "meetingDetailContent"
    );


function renderMeetingDetail(meeting) {
    const meetingDate =
        new Date(
            meeting.MeetingDate
        );

    byId("meetingDetailTitle")
        .textContent =
        meeting.Title;

    byId(
        "meetingDetailDescription"
    ).textContent =
        meeting.Description ||
        "No description added.";

    byId("meetingDetailMonth")
        .textContent =
        meetingDate
            .toLocaleDateString(
                "en-US",
                {
                    month: "short"
                }
            )
            .toUpperCase();

    byId("meetingDetailDay")
        .textContent =
        meetingDate.getDate();

    byId(
        "meetingDetailDateTime"
    ).textContent =
        formatDateTime(
            meeting.MeetingDate
        );

    byId(
        "meetingDetailLocation"
    ).textContent =
        meeting.Location ||
        "No location";

    byId(
        "meetingDetailParticipantCount"
    ).textContent =
        meeting.ParticipantCount ||
        0;

    byId(
        "meetingDetailDecisionCount"
    ).textContent =
        meeting.DecisionCount ||
        0;

    byId(
        "meetingDetailNotes"
    ).textContent =
        meeting.Notes ||
        "No notes added.";

    byId(
        "meetingDetailCreatedBy"
    ).textContent =
        meeting.CreatedByName ||
        "-";

    byId(
        "meetingDetailCreatedAt"
    ).textContent =
        formatDate(
            meeting.CreatedAt
        );

    meetingDetailMessage
        .classList
        .add("hidden");

    meetingDetailContent
        .classList
        .remove("hidden");
}


async function loadMeetingDetail() {
    if (
        !meetingDetailMessage ||
        !meetingDetailContent
    ) {
        return;
    }

    const meetingId =
        getMeetingIdFromUrl();

    if (!meetingId) {
        meetingDetailMessage.textContent =
            "Invalid meeting.";

        return;
    }

    try {
        const response =
            await fetch(
                `${API_BASE_URL}/meetings/${meetingId}`,
                {
                    headers:
                        getAuthHeaders()
                }
            );

        if (
            handleUnauthorized(
                response
            )
        ) {
            return;
        }

        const data =
            await response.json();

        if (!response.ok) {
            meetingDetailMessage.textContent =
                data.message ||
                "Meeting could not be loaded.";

            return;
        }

        renderMeetingDetail(
            data.meeting
        );

    } catch (error) {
        console.error(
            "Meeting detail error:",
            error
        );

        meetingDetailMessage.textContent =
            "Could not connect to the server.";
    }
}


/* =========================
   MEETING DECISIONS
========================= */

const meetingDecisionsList =
    byId(
        "meetingDecisionsList"
    );

const addDecisionButton =
    byId(
        "addDecisionButton"
    );


function renderMeetingDecisions(items) {
    if (!meetingDecisionsList) {
        return;
    }

    if (!items || items.length === 0) {
        meetingDecisionsList.innerHTML = `
            <p class="empty-message">
                No decisions have been added to this meeting yet.
            </p>
        `;

        return;
    }

    meetingDecisionsList.innerHTML =
        items
            .map((item) => {
                const progress =
                    getDecisionProgress(
                        item
                    );

                return `
                    <div class="decision-detail-card">

                        <div class="decision-detail-header">

                            <div>

                                <span class="implementation-badge">
                                    ${item.ImplementationStatus || "Not Started"}
                                </span>

                                <strong class="decision-detail-title">
                                    ${item.Title}
                                </strong>

                            </div>

                            <button
                                type="button"
                                class="small-action-button primary decision-create-action-button"
                                data-decision-id="${item.Id}"
                            >
                                + Create Action
                            </button>

                        </div>

                        ${
                            item.Description
                                ? `
                                    <p class="decision-detail-description">
                                        ${item.Description}
                                    </p>
                                `
                                : ""
                        }

                        <div class="decision-detail-meta">

                            <span>
                                👤 ${item.CreatedByName || "-"}
                            </span>

                            <span>
                                📅 ${formatDate(item.CreatedAt)}
                            </span>

                            <span>
                                ✓ ${item.CompletedActions || 0}
                                /
                                ${item.TotalActions || 0}
                                Actions
                            </span>

                        </div>

                        <div class="decision-progress-row">

                            <span>
                                Action Progress
                            </span>

                            <span>
                                ${progress}%
                            </span>

                        </div>

                        <div class="decision-progress-track">

                            <div
                                class="decision-progress-fill"
                                style="width: ${progress}%"
                            ></div>

                        </div>

                    </div>
                `;
            })
            .join("");
}


async function loadMeetingDecisions() {
    if (!meetingDecisionsList) {
        return;
    }

    const meetingId =
        getMeetingIdFromUrl();

    if (!meetingId) {
        return;
    }

    try {
        const response =
            await fetch(
                `${API_BASE_URL}/meetings/${meetingId}/decisions`,
                {
                    headers:
                        getAuthHeaders()
                }
            );

        if (
            handleUnauthorized(
                response
            )
        ) {
            return;
        }

        const data =
            await response.json();

        if (!response.ok) {
            meetingDecisionsList.innerHTML = `
                <p class="empty-message">
                    Decisions could not be loaded.
                </p>
            `;

            return;
        }

        renderMeetingDecisions(
            data.decisions
        );

    } catch (error) {
        console.error(
            "Meeting decisions error:",
            error
        );
    }
}


/* =========================
   CREATE DECISION
========================= */

function showDecisionForm() {
    if (!meetingDecisionsList) {
        return;
    }

    byId(
        "decisionCreateForm"
    )?.remove();

    const formContainer =
        document.createElement(
            "div"
        );

    formContainer.id =
        "decisionCreateForm";

    formContainer.className =
        "decision-create-form";

    formContainer.innerHTML = `
        <form id="newDecisionForm">

            <div class="form-field">

                <label>
                    Decision Title
                </label>

                <input
                    type="text"
                    id="decisionTitle"
                    required
                >

            </div>

            <div class="form-field">

                <label>
                    Description
                </label>

                <textarea
                    id="decisionDescription"
                    rows="3"
                ></textarea>

            </div>

            <div class="decision-form-actions">

                <button
                    type="button"
                    id="cancelDecisionButton"
                    class="secondary-button"
                >
                    Cancel
                </button>

                <button
                    type="submit"
                    class="page-primary-button"
                >
                    Create Decision
                </button>

            </div>

            <p
                id="decisionFormMessage"
                class="decision-form-message"
            ></p>

        </form>
    `;

    meetingDecisionsList
        .parentElement
        .insertBefore(
            formContainer,
            meetingDecisionsList
        );

    byId(
        "cancelDecisionButton"
    ).addEventListener(
        "click",
        () => {
            formContainer.remove();
        }
    );

    byId(
        "newDecisionForm"
    ).addEventListener(
        "submit",
        createDecision
    );
}


async function createDecision(event) {
    event.preventDefault();

    const meetingId =
        getMeetingIdFromUrl();

    const title =
        byId("decisionTitle")
            .value
            .trim();

    const description =
        byId(
            "decisionDescription"
        )
            .value
            .trim();

    const message =
        byId(
            "decisionFormMessage"
        );

    if (!title) {
        message.textContent =
            "Decision title is required.";

        return;
    }

    try {
        const response =
            await fetch(
                `${API_BASE_URL}/meetings/${meetingId}/decisions`,
                {
                    method: "POST",

                    headers:
                        getJsonAuthHeaders(),

                    body:
                        JSON.stringify({
                            title,
                            description
                        })
                }
            );

        if (
            handleUnauthorized(
                response
            )
        ) {
            return;
        }

        const data =
            await response.json();

        if (!response.ok) {
            message.textContent =
                data.message ||
                "Decision could not be created.";

            return;
        }

        byId(
            "decisionCreateForm"
        )?.remove();

        await loadMeetingDecisions();
        await loadMeetingDetail();

    } catch (error) {
        console.error(
            "Create decision error:",
            error
        );

        message.textContent =
            "Could not connect to the server.";
    }
}


if (addDecisionButton) {
    addDecisionButton
        .addEventListener(
            "click",
            showDecisionForm
        );
}


/* =========================
   STANDALONE DECISIONS PAGE
========================= */

const decisionsList =
    byId("decisionsList");

const decisionsPageMessage =
    byId(
        "decisionsPageMessage"
    );

const decisionSearchFilter =
    byId(
        "decisionSearchFilter"
    );

const decisionStatusFilter =
    byId(
        "decisionStatusFilter"
    );

const decisionMeetingFilter =
    byId(
        "decisionMeetingFilter"
    );

const decisionActionFilter =
    byId(
        "decisionActionFilter"
    );

const clearDecisionFiltersButton =
    byId(
        "clearDecisionFiltersButton"
    );

let allDecisionsPageItems = [];


function getDecisionStatusOptions(
    currentStatus
) {
    const statuses = [
        "Not Started",
        "In Progress",
        "Partially Implemented",
        "Implemented",
        "Not Implemented"
    ];

    return statuses
        .map(
            (status) => `
                <option
                    value="${status}"
                    ${
                        currentStatus ===
                        status
                            ? "selected"
                            : ""
                    }
                >
                    ${status}
                </option>
            `
        )
        .join("");
}


function renderDecisionsPage(items) {
    if (!decisionsList) {
        return;
    }

    if (!items || items.length === 0) {
        decisionsList.innerHTML = `
            <p class="empty-message">
                No decisions found.
            </p>
        `;

        return;
    }

    decisionsList.innerHTML =
        items
            .map((item) => {
                const progress =
                    getDecisionProgress(
                        item
                    );

                const currentStatus =
                    item.ImplementationStatus ||
                    "Not Started";

                return `
                    <div class="decision-detail-card">

                        <div class="decision-detail-header">

                            <div>

                                <span class="implementation-badge">
                                    ${currentStatus}
                                </span>

                                <strong class="decision-detail-title">
                                    ${item.Title}
                                </strong>

                            </div>

                            <div class="meeting-page-actions">

                                <select
                                    class="action-status-select decision-implementation-status-select"
                                    data-decision-id="${item.Id}"
                                    data-old-status="${currentStatus}"
                                >
                                    ${getDecisionStatusOptions(currentStatus)}
                                </select>

                                <button
                                    type="button"
                                    class="small-action-button primary view-decision-meeting-button"
                                    data-meeting-id="${item.MeetingId}"
                                >
                                    View Meeting
                                </button>

                            </div>

                        </div>

                        ${
                            item.Description
                                ? `
                                    <p class="decision-detail-description">
                                        ${item.Description}
                                    </p>
                                `
                                : ""
                        }

                        <div class="decision-detail-meta">

                            <span>
                                📌 ${item.MeetingTitle || "Meeting"}
                            </span>

                            <span>
                                👤 ${item.CreatedByName || "-"}
                            </span>

                            <span>
                                📅 ${formatDate(item.CreatedAt)}
                            </span>

                            <span>
                                ✓ ${item.CompletedActions || 0}
                                /
                                ${item.TotalActions || 0}
                                Actions
                            </span>

                        </div>

                        <div class="decision-progress-row">

                            <span>
                                Action Progress
                            </span>

                            <span>
                                ${progress}%
                            </span>

                        </div>

                        <div class="decision-progress-track">

                            <div
                                class="decision-progress-fill"
                                style="width: ${progress}%"
                            ></div>

                        </div>

                        ${
                            currentStatus === "Implemented"
                                ? `
                                    <div class="completed-result" style="margin-top: 16px;">

                                        <span class="completed-result-label">
                                            Final Result
                                        </span>

                                        <textarea
                                            class="decision-final-result-input"
                                            data-decision-id="${item.Id}"
                                            rows="3"
                                            placeholder="Write the final result..."
                                            style="width: 100%; margin-top: 8px; padding: 10px 12px; border: 1px solid #dbe1ec; border-radius: 10px; resize: vertical; font-family: inherit;"
                                        >${item.FinalResult || ""}</textarea>

                                        <div class="decision-form-actions" style="margin-top: 10px;">
                                            <button
                                                type="button"
                                                class="page-primary-button save-decision-result-button"
                                                data-decision-id="${item.Id}"
                                            >
                                                Save Result
                                            </button>
                                        </div>

                                    </div>
                                `
                                : ""
                        }

                    </div>
                `;
            })
            .join("");
}


function fillDecisionMeetingFilter(
    meetings
) {
    if (!decisionMeetingFilter) {
        return;
    }

    decisionMeetingFilter.innerHTML = `
        <option value="">
            All Meetings
        </option>
    `;

    meetings.forEach(
        (meeting) => {
            decisionMeetingFilter
                .innerHTML += `
                    <option value="${meeting.Id}">
                        ${meeting.Title}
                    </option>
                `;
        }
    );
}


function applyDecisionFilters() {
    if (!decisionsList) {
        return;
    }

    const search =
        (
            decisionSearchFilter
                ?.value ||
            ""
        )
            .trim()
            .toLowerCase();

    const status =
        decisionStatusFilter
            ?.value ||
        "";

    const meetingId =
        decisionMeetingFilter
            ?.value ||
        "";

    const actionFilter =
        decisionActionFilter
            ?.value ||
        "";

    const filtered =
        allDecisionsPageItems
            .filter((item) => {
                const searchable =
                    [
                        item.Title,
                        item.Description,
                        item.MeetingTitle,
                        item.CreatedByName
                    ]
                        .filter(Boolean)
                        .join(" ")
                        .toLowerCase();

                if (
                    search &&
                    !searchable.includes(
                        search
                    )
                ) {
                    return false;
                }

                if (
                    status &&
                    item.ImplementationStatus !==
                        status
                ) {
                    return false;
                }

                if (
                    meetingId &&
                    String(
                        item.MeetingId
                    ) !==
                        meetingId
                ) {
                    return false;
                }

                const totalActions =
                    Number(
                        item.TotalActions
                    ) || 0;

                if (
                    actionFilter ===
                        "with-actions" &&
                    totalActions === 0
                ) {
                    return false;
                }

                if (
                    actionFilter ===
                        "without-actions" &&
                    totalActions > 0
                ) {
                    return false;
                }

                return true;
            });

    renderDecisionsPage(
        filtered
    );

    if (
        decisionsPageMessage
    ) {
        decisionsPageMessage
            .textContent =
            `${filtered.length} decision(s) found.`;
    }
}


async function loadDecisionsPage() {
    if (!decisionsList) {
        return;
    }

    if (
        decisionsPageMessage
    ) {
        decisionsPageMessage
            .textContent =
            "Loading decisions...";
    }

    try {
        const meetingsResponse =
            await fetch(
                `${API_BASE_URL}/meetings`,
                {
                    headers:
                        getAuthHeaders()
                }
            );

        if (
            handleUnauthorized(
                meetingsResponse
            )
        ) {
            return;
        }

        const meetingsData =
            await meetingsResponse
                .json();

        if (!meetingsResponse.ok) {
            decisionsPageMessage.textContent =
                meetingsData.message ||
                "Decisions could not be loaded.";

            return;
        }

        const meetings =
            meetingsData.meetings ||
            [];

        fillDecisionMeetingFilter(
            meetings
        );

        const decisionGroups =
            await Promise.all(
                meetings.map(
                    async (meeting) => {
                        const response =
                            await fetch(
                                `${API_BASE_URL}/meetings/${meeting.Id}/decisions`,
                                {
                                    headers:
                                        getAuthHeaders()
                                }
                            );

                        if (
                            handleUnauthorized(
                                response
                            )
                        ) {
                            return [];
                        }

                        const data =
                            await response.json();

                        if (!response.ok) {
                            console.error(
                                `Decisions could not be loaded for meeting ${meeting.Id}`,
                                data
                            );

                            return [];
                        }

                        return (
                            data.decisions ||
                            []
                        ).map(
                            (decision) => ({
                                ...decision,

                                MeetingId:
                                    meeting.Id,

                                MeetingTitle:
                                    meeting.Title
                            })
                        );
                    }
                )
            );

        allDecisionsPageItems =
            decisionGroups.flat();

        applyDecisionFilters();

    } catch (error) {
        console.error(
            "Decisions page error:",
            error
        );

        if (
            decisionsPageMessage
        ) {
            decisionsPageMessage
                .textContent =
                "Could not connect to the server.";
        }
    }
}


/* =========================
   UPDATE DECISION STATUS
========================= */

async function updateDecisionImplementationStatus(
    decisionId,
    implementationStatus
) {
    const decision =
        allDecisionsPageItems.find(
            (item) =>
                Number(item.Id) ===
                Number(decisionId)
        );

    if (!decision) {
        return false;
    }

    const oldStatus =
        decision.ImplementationStatus ||
        "Not Started";

    if (
        decisionsPageMessage
    ) {
        decisionsPageMessage
            .textContent =
            "Updating decision...";
    }

    try {
        const response =
            await fetch(
                `${API_BASE_URL}/decisions/${decisionId}/implementation-status`,
                {
                    method: "PATCH",

                    headers:
                        getJsonAuthHeaders(),

                    body:
                        JSON.stringify({
                            implementationStatus,

                            finalResult:
                                decision.FinalResult ||
                                null
                        })
                }
            );

        if (
            handleUnauthorized(
                response
            )
        ) {
            return false;
        }

        const data =
            await response.json();

        if (!response.ok) {
            alert(
                data.message ||
                "Decision status could not be updated."
            );

            decision.ImplementationStatus =
                oldStatus;

            applyDecisionFilters();

            return false;
        }

        decision.ImplementationStatus =
            implementationStatus;

        applyDecisionFilters();

        return true;

    } catch (error) {
        console.error(
            "Update decision status error:",
            error
        );

        decision.ImplementationStatus =
            oldStatus;

        if (
            decisionsPageMessage
        ) {
            decisionsPageMessage
                .textContent =
                "Could not connect to the server.";
        }

        applyDecisionFilters();

        return false;
    }
}


async function updateDecisionFinalResult(
    decisionId,
    finalResult
) {
    const decision =
        allDecisionsPageItems.find(
            (item) =>
                Number(item.Id) ===
                Number(decisionId)
        );

    if (!decision) {
        return false;
    }

    const implementationStatus =
        decision.ImplementationStatus ||
        "Not Started";

    if (
        implementationStatus !==
        "Implemented"
    ) {
        alert(
            "Final result can be saved only for implemented decisions."
        );

        return false;
    }

    if (
        decisionsPageMessage
    ) {
        decisionsPageMessage
            .textContent =
            "Saving final result...";
    }

    try {
        const response =
            await fetch(
                `${API_BASE_URL}/decisions/${decisionId}/implementation-status`,
                {
                    method: "PATCH",

                    headers:
                        getJsonAuthHeaders(),

                    body:
                        JSON.stringify({
                            implementationStatus,
                            finalResult:
                                finalResult ||
                                null
                        })
                }
            );

        if (
            handleUnauthorized(
                response
            )
        ) {
            return false;
        }

        const data =
            await response.json();

        if (!response.ok) {
            alert(
                data.message ||
                "Final result could not be saved."
            );

            applyDecisionFilters();

            return false;
        }

        decision.FinalResult =
            finalResult ||
            null;

        applyDecisionFilters();

        if (
            decisionsPageMessage
        ) {
            decisionsPageMessage
                .textContent =
                "Final result saved successfully.";
        }

        return true;

    } catch (error) {
        console.error(
            "Update final result error:",
            error
        );

        if (
            decisionsPageMessage
        ) {
            decisionsPageMessage
                .textContent =
                "Could not connect to the server.";
        }

        return false;
    }
}


if (decisionsList) {
    decisionsList.addEventListener(
        "click",
        async (event) => {
            const saveButton =
                event.target.closest(
                    ".save-decision-result-button"
                );

            if (saveButton) {
                const decisionId =
                    Number(
                        saveButton.dataset
                            .decisionId
                    );

                const card =
                    saveButton.closest(
                        ".decision-detail-card"
                    );

                const input =
                    card?.querySelector(
                        ".decision-final-result-input"
                    );

                if (!input) {
                    return;
                }

                await updateDecisionFinalResult(
                    decisionId,
                    input.value.trim()
                );

                return;
            }

            const button =
                event.target.closest(
                    ".view-decision-meeting-button"
                );

            if (!button) {
                return;
            }

            window.location.href =
                `meeting-detail.html?id=${button.dataset.meetingId}`;
        }
    );


    decisionsList.addEventListener(
        "change",
        async (event) => {
            const select =
                event.target.closest(
                    ".decision-implementation-status-select"
                );

            if (!select) {
                return;
            }

            const decisionId =
                Number(
                    select.dataset.decisionId
                );

            const newStatus =
                select.value;

            await updateDecisionImplementationStatus(
                decisionId,
                newStatus
            );
        }
    );
}


/* =========================
   DECISION FILTER EVENTS
========================= */

let decisionSearchTimer;

if (decisionSearchFilter) {
    decisionSearchFilter
        .addEventListener(
            "input",
            () => {
                clearTimeout(
                    decisionSearchTimer
                );

                decisionSearchTimer =
                    setTimeout(
                        applyDecisionFilters,
                        300
                    );
            }
        );
}

if (decisionStatusFilter) {
    decisionStatusFilter
        .addEventListener(
            "change",
            applyDecisionFilters
        );
}

if (decisionMeetingFilter) {
    decisionMeetingFilter
        .addEventListener(
            "change",
            applyDecisionFilters
        );
}

if (decisionActionFilter) {
    decisionActionFilter
        .addEventListener(
            "change",
            applyDecisionFilters
        );
}

if (
    clearDecisionFiltersButton
) {
    clearDecisionFiltersButton
        .addEventListener(
            "click",
            () => {
                if (
                    decisionSearchFilter
                ) {
                    decisionSearchFilter
                        .value =
                        "";
                }

                if (
                    decisionStatusFilter
                ) {
                    decisionStatusFilter
                        .value =
                        "";
                }

                if (
                    decisionMeetingFilter
                ) {
                    decisionMeetingFilter
                        .value =
                        "";
                }

                if (
                    decisionActionFilter
                ) {
                    decisionActionFilter
                        .value =
                        "";
                }

                applyDecisionFilters();
            }
        );
}


/* =========================
   PARTICIPANTS
========================= */

const meetingParticipantsList =
    byId(
        "meetingParticipantsList"
    );

const addParticipantButton =
    byId(
        "addParticipantButton"
    );


function renderMeetingParticipants(
    items
) {
    if (
        !meetingParticipantsList
    ) {
        return;
    }

    if (!items || items.length === 0) {
        meetingParticipantsList.innerHTML = `
            <p class="empty-message">
                No participants have been added yet.
            </p>
        `;

        return;
    }

    meetingParticipantsList.innerHTML =
        items
            .map(
                (item) => `
                    <div class="participant-card">

                        <div class="participant-avatar">
                            ${getInitials(item.FullName)}
                        </div>

                        <div class="participant-info">

                            <strong>
                                ${item.FullName || "Unknown User"}
                            </strong>

                            <span>
                                ${item.Email || ""}
                            </span>

                        </div>

                    </div>
                `
            )
            .join("");
}


async function loadMeetingParticipants() {
    if (
        !meetingParticipantsList
    ) {
        return;
    }

    const meetingId =
        getMeetingIdFromUrl();

    if (!meetingId) {
        return;
    }

    try {
        const response =
            await fetch(
                `${API_BASE_URL}/meetings/${meetingId}/participants`,
                {
                    headers:
                        getAuthHeaders()
                }
            );

        if (
            handleUnauthorized(
                response
            )
        ) {
            return;
        }

        const data =
            await response.json();

        if (!response.ok) {
            return;
        }

        renderMeetingParticipants(
            data.participants
        );

    } catch (error) {
        console.error(
            "Participants error:",
            error
        );
    }
}


async function getAvailableParticipants() {
    const meetingId =
        getMeetingIdFromUrl();

    if (!meetingId) {
        return [];
    }

    try {
        const response =
            await fetch(
                `${API_BASE_URL}/meetings/${meetingId}/available-participants`,
                {
                    headers:
                        getAuthHeaders()
                }
            );

        if (
            handleUnauthorized(
                response
            )
        ) {
            return [];
        }

        const data =
            await response.json();

        if (!response.ok) {
            return [];
        }

        return data.users || [];

    } catch (error) {
        console.error(
            "Available participants error:",
            error
        );

        return [];
    }
}


async function showParticipantForm() {
    if (
        !meetingParticipantsList
    ) {
        return;
    }

    const oldForm =
        byId(
            "participantCreateForm"
        );

    if (oldForm) {
        oldForm.remove();
        return;
    }

    const formContainer =
        document.createElement(
            "div"
        );

    formContainer.id =
        "participantCreateForm";

    formContainer.className =
        "decision-create-form";

    formContainer.innerHTML =
        "Loading users...";

    meetingParticipantsList
        .parentElement
        .insertBefore(
            formContainer,
            meetingParticipantsList
        );

    const users =
        await getAvailableParticipants();

    if (users.length === 0) {
        formContainer.innerHTML = `
            <p class="empty-message">
                No other users are available to add.
            </p>
        `;

        return;
    }

    const options =
        users
            .map(
                (user) => `
                    <option value="${user.Id}">
                        ${user.FullName} — ${user.Email}
                    </option>
                `
            )
            .join("");

    formContainer.innerHTML = `
        <form id="newParticipantForm">

            <div class="form-field">

                <label>
                    Select User
                </label>

                <select
                    id="participantUserId"
                    required
                >

                    <option value="">
                        Select a participant
                    </option>

                    ${options}

                </select>

            </div>

            <div class="decision-form-actions">

                <button
                    type="button"
                    id="cancelParticipantButton"
                    class="secondary-button"
                >
                    Cancel
                </button>

                <button
                    type="submit"
                    class="page-primary-button"
                >
                    Add Participant
                </button>

            </div>

            <p
                id="participantFormMessage"
                class="decision-form-message"
            ></p>

        </form>
    `;

    byId(
        "cancelParticipantButton"
    ).addEventListener(
        "click",
        () => {
            formContainer.remove();
        }
    );

    byId(
        "newParticipantForm"
    ).addEventListener(
        "submit",
        addParticipant
    );
}


async function addParticipant(event) {
    event.preventDefault();

    const meetingId =
        getMeetingIdFromUrl();

    const userId =
        Number(
            byId(
                "participantUserId"
            ).value
        );

    const message =
        byId(
            "participantFormMessage"
        );

    if (!userId) {
        message.textContent =
            "Please select a participant.";

        return;
    }

    try {
        const response =
            await fetch(
                `${API_BASE_URL}/meetings/${meetingId}/participants`,
                {
                    method: "POST",

                    headers:
                        getJsonAuthHeaders(),

                    body:
                        JSON.stringify({
                            userId
                        })
                }
            );

        if (
            handleUnauthorized(
                response
            )
        ) {
            return;
        }

        const data =
            await response.json();

        if (!response.ok) {
            message.textContent =
                data.message ||
                "Participant could not be added.";

            return;
        }

        byId(
            "participantCreateForm"
        )?.remove();

        await loadMeetingParticipants();
        await loadMeetingDetail();

    } catch (error) {
        console.error(
            "Add participant error:",
            error
        );

        message.textContent =
            "Could not connect to the server.";
    }
}


if (addParticipantButton) {
    addParticipantButton
        .addEventListener(
            "click",
            showParticipantForm
        );
}


/* =========================
   CREATE ACTION FROM DECISION
========================= */

async function getParticipantsForAction() {
    const meetingId =
        getMeetingIdFromUrl();

    if (!meetingId) {
        return [];
    }

    try {
        const response =
            await fetch(
                `${API_BASE_URL}/meetings/${meetingId}/participants`,
                {
                    headers:
                        getAuthHeaders()
                }
            );

        if (
            handleUnauthorized(
                response
            )
        ) {
            return [];
        }

        const data =
            await response.json();

        return (
            data.participants ||
            []
        );

    } catch (error) {
        console.error(
            "Action participants error:",
            error
        );

        return [];
    }
}


async function showActionForm(
    decisionId,
    decisionCard
) {
    byId(
        "actionCreateForm"
    )?.remove();

    const participants =
        await getParticipantsForAction();

    if (
        participants.length === 0
    ) {
        alert(
            "Add a participant before creating an action."
        );

        return;
    }

    const options =
        participants
            .map(
                (participant) => {
                    const userId =
                        participant.UserId ||
                        participant.Id;

                    return `
                        <option value="${userId}">
                            ${participant.FullName}
                        </option>
                    `;
                }
            )
            .join("");

    const formContainer =
        document.createElement(
            "div"
        );

    formContainer.id =
        "actionCreateForm";

    formContainer.className =
        "decision-create-form";

    formContainer.innerHTML = `
        <form
            id="newActionForm"
            data-decision-id="${decisionId}"
        >

            <div class="form-field">

                <label>
                    Action Title
                </label>

                <input
                    id="actionTitle"
                    type="text"
                    required
                >

            </div>

            <div class="form-field">

                <label>
                    Description
                </label>

                <textarea
                    id="actionDescription"
                    rows="3"
                ></textarea>

            </div>

            <div class="form-field">

                <label>
                    Responsible Person
                </label>

                <select
                    id="actionResponsibleUser"
                    required
                >

                    <option value="">
                        Select participant
                    </option>

                    ${options}

                </select>

            </div>

            <div class="form-field">

                <label>
                    Priority
                </label>

                <select
                    id="actionPriority"
                >

                    <option value="Low">
                        Low
                    </option>

                    <option
                        value="Medium"
                        selected
                    >
                        Medium
                    </option>

                    <option value="High">
                        High
                    </option>

                    <option value="Critical">
                        Critical
                    </option>

                </select>

            </div>

            <div class="form-field">

                <label>
                    Start Date
                </label>

                <input
                    id="actionStartDate"
                    type="date"
                >

            </div>

            <div class="form-field">

                <label>
                    Deadline
                </label>

                <input
                    id="actionDeadline"
                    type="date"
                    required
                >

            </div>

            <div class="decision-form-actions">

                <button
                    type="button"
                    id="cancelActionButton"
                    class="secondary-button"
                >
                    Cancel
                </button>

                <button
                    type="submit"
                    class="page-primary-button"
                >
                    Create Action
                </button>

            </div>

            <p
                id="actionFormMessage"
                class="decision-form-message"
            ></p>

        </form>
    `;

    decisionCard.appendChild(
        formContainer
    );

    byId(
        "cancelActionButton"
    ).addEventListener(
        "click",
        () => {
            formContainer.remove();
        }
    );

    byId(
        "newActionForm"
    ).addEventListener(
        "submit",
        createAction
    );
}


async function createAction(event) {
    event.preventDefault();

    const form =
        event.currentTarget;

    const decisionId =
        Number(
            form.dataset.decisionId
        );

    const title =
        byId("actionTitle")
            .value
            .trim();

    const description =
        byId(
            "actionDescription"
        )
            .value
            .trim();

    const responsibleUserId =
        Number(
            byId(
                "actionResponsibleUser"
            ).value
        );

    const priority =
        byId(
            "actionPriority"
        ).value;

    const startDate =
        byId(
            "actionStartDate"
        ).value;

    const deadline =
        byId(
            "actionDeadline"
        ).value;

    const message =
        byId(
            "actionFormMessage"
        );

    if (
        !title ||
        !responsibleUserId ||
        !deadline
    ) {
        message.textContent =
            "Title, responsible person and deadline are required.";

        return;
    }

    try {
        const response =
            await fetch(
                `${API_BASE_URL}/decisions/${decisionId}/actions`,
                {
                    method: "POST",

                    headers:
                        getJsonAuthHeaders(),

                    body:
                        JSON.stringify({
                            title,
                            description,
                            responsibleUserId,
                            priority,

                            startDate:
                                startDate ||
                                null,

                            deadline
                        })
                }
            );

        if (
            handleUnauthorized(
                response
            )
        ) {
            return;
        }

        const data =
            await response.json();

        if (!response.ok) {
            message.textContent =
                data.message ||
                "Action could not be created.";

            return;
        }

        byId(
            "actionCreateForm"
        )?.remove();

        await loadMeetingDecisions();
        await loadMeetingDetail();

    } catch (error) {
        console.error(
            "Create action error:",
            error
        );

        message.textContent =
            "Could not connect to the server.";
    }
}


if (meetingDecisionsList) {
    meetingDecisionsList
        .addEventListener(
            "click",
            (event) => {
                const button =
                    event.target.closest(
                        ".decision-create-action-button"
                    );

                if (!button) {
                    return;
                }

                const decisionCard =
                    button.closest(
                        ".decision-detail-card"
                    );

                showActionForm(
                    Number(
                        button.dataset
                            .decisionId
                    ),
                    decisionCard
                );
            }
        );
}


/* =========================
   ACTIONS PAGE
========================= */

const actionsList =
    byId("actionsList");

const actionsPageMessage =
    byId(
        "actionsPageMessage"
    );

const actionSearchFilter =
    byId(
        "actionSearchFilter"
    );

const actionStatusFilter =
    byId(
        "actionStatusFilter"
    );

const actionPriorityFilter =
    byId(
        "actionPriorityFilter"
    );

const actionResponsibleFilter =
    byId(
        "actionResponsibleFilter"
    );

const actionOverdueFilter =
    byId(
        "actionOverdueFilter"
    );

const clearActionFiltersButton =
    byId(
        "clearActionFiltersButton"
    );


function renderActionsPage(items) {
    if (!actionsList) {
        return;
    }

    if (!items || items.length === 0) {
        actionsList.innerHTML = `
            <p class="empty-message">
                No actions found.
            </p>
        `;

        return;
    }

    const statuses = [
        "To Do",
        "In Progress",
        "Blocked",
        "Completed",
        "Cancelled"
    ];

    actionsList.innerHTML =
        items
            .map((item) => {
                const progress =
                    Number(
                        item.Progress
                    ) || 0;

                const overdue =
                    item.IsOverdue ===
                        true ||
                    item.IsOverdue ===
                        1 ||
                    isActionOverdue(
                        item
                    );

                return `
                    <div class="action-summary-card">

                        <div class="action-card-header">

                            <strong class="action-title">
                                ${item.Title}
                            </strong>

                            <div class="action-badges">

                                ${
                                    overdue
                                        ? `
                                            <span class="badge overdue-badge">
                                                OVERDUE
                                            </span>
                                        `
                                        : ""
                                }

                                <span class="badge ${getPriorityClass(item.Priority)}">
                                    ${item.Priority || "Medium"}
                                </span>

                            </div>

                        </div>

                        ${
                            item.Description
                                ? `
                                    <p class="meeting-page-description">
                                        ${item.Description}
                                    </p>
                                `
                                : ""
                        }

                        <div class="action-meta">

                            <span>
                                👤 ${item.ResponsiblePerson || "Unassigned"}
                            </span>

                            <span>
                                📅 ${formatDate(item.Deadline)}
                            </span>

                        </div>

                        <div class="action-status-row">

                            <select
                                class="action-status-select"
                                data-action-id="${item.Id}"
                            >
                                ${
                                    statuses
                                        .map(
                                            (status) => `
                                                <option
                                                    value="${status}"
                                                    ${
                                                        item.Status === status
                                                            ? "selected"
                                                            : ""
                                                    }
                                                >
                                                    ${status}
                                                </option>
                                            `
                                        )
                                        .join("")
                                }
                            </select>

                            <span class="progress-percentage">
                                ${progress}%
                            </span>

                        </div>

                        <input
                            type="range"
                            min="0"
                            max="100"
                            step="10"
                            value="${progress}"
                            class="action-progress-range"
                            data-action-id="${item.Id}"
                        >

                        <div class="progress-track">

                            <div
                                class="progress-fill"
                                style="width: ${progress}%"
                            ></div>

                        </div>

                    </div>
                `;
            })
            .join("");
}


function buildActionFilterQuery() {
    const params =
        new URLSearchParams();

    if (
        actionSearchFilter &&
        actionSearchFilter
            .value
            .trim()
    ) {
        params.set(
            "search",
            actionSearchFilter
                .value
                .trim()
        );
    }

    if (
        actionStatusFilter &&
        actionStatusFilter.value
    ) {
        params.set(
            "status",
            actionStatusFilter.value
        );
    }

    if (
        actionPriorityFilter &&
        actionPriorityFilter.value
    ) {
        params.set(
            "priority",
            actionPriorityFilter.value
        );
    }

    if (
        actionResponsibleFilter &&
        actionResponsibleFilter.value
    ) {
        params.set(
            "responsibleUserId",
            actionResponsibleFilter.value
        );
    }

    if (
        actionOverdueFilter &&
        actionOverdueFilter.checked
    ) {
        params.set(
            "overdue",
            "true"
        );
    }

    return params.toString();
}


async function loadResponsibleFilterOptions() {
    if (
        !actionResponsibleFilter
    ) {
        return;
    }

    try {
        const response =
            await fetch(
                `${API_BASE_URL}/decisions/actions`,
                {
                    headers:
                        getAuthHeaders()
                }
            );

        if (
            handleUnauthorized(
                response
            )
        ) {
            return;
        }

        const data =
            await response.json();

        if (!response.ok) {
            return;
        }

        const people =
            new Map();

        (
            data.actions ||
            []
        ).forEach(
            (item) => {
                if (
                    item.ResponsibleUserId &&
                    item.ResponsiblePerson
                ) {
                    people.set(
                        item.ResponsibleUserId,
                        item.ResponsiblePerson
                    );
                }
            }
        );

        actionResponsibleFilter.innerHTML = `
            <option value="">
                All People
            </option>
        `;

        people.forEach(
            (name, id) => {
                actionResponsibleFilter.innerHTML += `
                    <option value="${id}">
                        ${name}
                    </option>
                `;
            }
        );

    } catch (error) {
        console.error(
            "Responsible filter error:",
            error
        );
    }
}


async function loadActionsPage() {
    if (!actionsList) {
        return;
    }

    if (actionsPageMessage) {
        actionsPageMessage.textContent =
            "Loading actions...";
    }

    const query =
        buildActionFilterQuery();

    const url =
        query
            ? `${API_BASE_URL}/decisions/actions?${query}`
            : `${API_BASE_URL}/decisions/actions`;

    try {
        const response =
            await fetch(
                url,
                {
                    headers:
                        getAuthHeaders()
                }
            );

        if (
            handleUnauthorized(
                response
            )
        ) {
            return;
        }

        const data =
            await response.json();

        if (!response.ok) {
            if (
                actionsPageMessage
            ) {
                actionsPageMessage.textContent =
                    data.message ||
                    "Actions could not be loaded.";
            }

            return;
        }

        if (
            actionsPageMessage
        ) {
            actionsPageMessage.textContent =
                `${data.count} action(s) found.`;
        }

        renderActionsPage(
            data.actions
        );

    } catch (error) {
        console.error(
            "Actions page error:",
            error
        );

        if (
            actionsPageMessage
        ) {
            actionsPageMessage.textContent =
                "Could not connect to the server.";
        }
    }
}


/* =========================
   ACTION STATUS UPDATE
========================= */

async function updateActionStatus(
    actionId,
    status
) {
    try {
        const response =
            await fetch(
                `${API_BASE_URL}/decisions/actions/${actionId}/status`,
                {
                    method: "PATCH",

                    headers:
                        getJsonAuthHeaders(),

                    body:
                        JSON.stringify({
                            status
                        })
                }
            );

        if (
            handleUnauthorized(
                response
            )
        ) {
            return;
        }

        const data =
            await response.json();

        if (!response.ok) {
            alert(
                data.message ||
                "Status could not be updated."
            );
        }

        await loadActionsPage();

    } catch (error) {
        console.error(
            "Update status error:",
            error
        );
    }
}


/* =========================
   ACTION PROGRESS UPDATE
========================= */

async function updateActionProgress(
    actionId,
    progress
) {
    try {
        const response =
            await fetch(
                `${API_BASE_URL}/decisions/actions/${actionId}/progress`,
                {
                    method: "PATCH",

                    headers:
                        getJsonAuthHeaders(),

                    body:
                        JSON.stringify({
                            progress
                        })
                }
            );

        if (
            handleUnauthorized(
                response
            )
        ) {
            return;
        }

        const data =
            await response.json();

        if (!response.ok) {
            alert(
                data.message ||
                "Progress could not be updated."
            );

            await loadActionsPage();
        }

    } catch (error) {
        console.error(
            "Update progress error:",
            error
        );
    }
}


if (actionsList) {
    actionsList.addEventListener(
        "input",
        (event) => {
            const range =
                event.target.closest(
                    ".action-progress-range"
                );

            if (!range) {
                return;
            }

            const card =
                range.closest(
                    ".action-summary-card"
                );

            if (!card) {
                return;
            }

            const percentage =
                card.querySelector(
                    ".progress-percentage"
                );

            const fill =
                card.querySelector(
                    ".progress-fill"
                );

            if (percentage) {
                percentage.textContent =
                    `${range.value}%`;
            }

            if (fill) {
                fill.style.width =
                    `${range.value}%`;
            }
        }
    );


    actionsList.addEventListener(
        "change",
        async (event) => {
            const statusSelect =
                event.target.closest(
                    ".action-status-select"
                );

            if (statusSelect) {
                await updateActionStatus(
                    Number(
                        statusSelect
                            .dataset
                            .actionId
                    ),
                    statusSelect.value
                );

                return;
            }

            const range =
                event.target.closest(
                    ".action-progress-range"
                );

            if (!range) {
                return;
            }

            await updateActionProgress(
                Number(
                    range
                        .dataset
                        .actionId
                ),
                Number(
                    range.value
                )
            );
        }
    );
}


/* =========================
   ACTION FILTER EVENTS
========================= */

let actionSearchTimer;

if (actionSearchFilter) {
    actionSearchFilter
        .addEventListener(
            "input",
            () => {
                clearTimeout(
                    actionSearchTimer
                );

                actionSearchTimer =
                    setTimeout(
                        loadActionsPage,
                        300
                    );
            }
        );
}

if (actionStatusFilter) {
    actionStatusFilter
        .addEventListener(
            "change",
            loadActionsPage
        );
}

if (actionPriorityFilter) {
    actionPriorityFilter
        .addEventListener(
            "change",
            loadActionsPage
        );
}

if (actionResponsibleFilter) {
    actionResponsibleFilter
        .addEventListener(
            "change",
            loadActionsPage
        );
}

if (actionOverdueFilter) {
    actionOverdueFilter
        .addEventListener(
            "change",
            loadActionsPage
        );
}

if (
    clearActionFiltersButton
) {
    clearActionFiltersButton
        .addEventListener(
            "click",
            () => {
                if (
                    actionSearchFilter
                ) {
                    actionSearchFilter
                        .value =
                        "";
                }

                if (
                    actionStatusFilter
                ) {
                    actionStatusFilter
                        .value =
                        "";
                }

                if (
                    actionPriorityFilter
                ) {
                    actionPriorityFilter
                        .value =
                        "";
                }

                if (
                    actionResponsibleFilter
                ) {
                    actionResponsibleFilter
                        .value =
                        "";
                }

                if (
                    actionOverdueFilter
                ) {
                    actionOverdueFilter
                        .checked =
                        false;
                }

                loadActionsPage();
            }
        );
}


/* =========================
   KANBAN
========================= */

const kanbanMessage =
    byId("kanbanMessage");

const kanbanTodoList =
    byId("kanbanTodoList");

const kanbanProgressList =
    byId(
        "kanbanProgressList"
    );

const kanbanBlockedList =
    byId(
        "kanbanBlockedList"
    );

const kanbanCompletedList =
    byId(
        "kanbanCompletedList"
    );


function renderKanbanCards(
    container,
    items
) {
    if (!container) {
        return;
    }

    if (!items || items.length === 0) {
        container.innerHTML = `
            <p class="empty-message">
                No actions.
            </p>
        `;

        return;
    }

    container.innerHTML =
        items
            .map((item) => {
                const progress =
                    Number(
                        item.Progress
                    ) || 0;

                const overdue =
                    item.IsOverdue ===
                        true ||
                    item.IsOverdue ===
                        1 ||
                    isActionOverdue(
                        item
                    );

                return `
                    <div class="kanban-card">

                        <div class="kanban-card-top">

                            <strong class="kanban-card-title">
                                ${item.Title}
                            </strong>

                            <div class="action-badges">

                                ${
                                    overdue
                                        ? `
                                            <span class="badge overdue-badge">
                                                OVERDUE
                                            </span>
                                        `
                                        : ""
                                }

                                <span class="badge ${getPriorityClass(item.Priority)}">
                                    ${item.Priority || "Medium"}
                                </span>

                            </div>

                        </div>

                        ${
                            item.Description
                                ? `
                                    <p class="kanban-card-description">
                                        ${item.Description}
                                    </p>
                                `
                                : ""
                        }

                        <div class="kanban-card-meta">

                            <span>
                                👤 ${item.ResponsiblePerson || "Unassigned"}
                            </span>

                            <span>
                                📅 ${formatDate(item.Deadline)}
                            </span>

                        </div>

                        <div class="kanban-card-progress">

                            <span>
                                Progress
                            </span>

                            <strong>
                                ${progress}%
                            </strong>

                        </div>

                        <div class="progress-track">

                            <div
                                class="progress-fill"
                                style="width: ${progress}%"
                            ></div>

                        </div>

                    </div>
                `;
            })
            .join("");
}


async function loadKanban() {
    if (
        !kanbanTodoList ||
        !kanbanProgressList ||
        !kanbanBlockedList ||
        !kanbanCompletedList
    ) {
        return;
    }

    if (kanbanMessage) {
        kanbanMessage.textContent =
            "Loading board...";
    }

    try {
        const response =
            await fetch(
                `${API_BASE_URL}/decisions/actions/kanban`,
                {
                    headers:
                        getAuthHeaders()
                }
            );

        if (
            handleUnauthorized(
                response
            )
        ) {
            return;
        }

        const data =
            await response.json();

        if (!response.ok) {
            if (
                kanbanMessage
            ) {
                kanbanMessage.textContent =
                    data.message ||
                    "Kanban could not be loaded.";
            }

            return;
        }

        const columns =
            data.columns ||
            {};

        const toDo =
            columns.toDo ||
            [];

        const inProgress =
            columns.inProgress ||
            [];

        const blocked =
            columns.blocked ||
            [];

        const completed =
            columns.completed ||
            [];

        renderKanbanCards(
            kanbanTodoList,
            toDo
        );

        renderKanbanCards(
            kanbanProgressList,
            inProgress
        );

        renderKanbanCards(
            kanbanBlockedList,
            blocked
        );

        renderKanbanCards(
            kanbanCompletedList,
            completed
        );

        const todoCount =
            byId(
                "kanbanTodoCount"
            );

        const progressCount =
            byId(
                "kanbanProgressCount"
            );

        const blockedCount =
            byId(
                "kanbanBlockedCount"
            );

        const completedCount =
            byId(
                "kanbanCompletedCount"
            );

        if (todoCount) {
            todoCount.textContent =
                toDo.length;
        }

        if (progressCount) {
            progressCount.textContent =
                inProgress.length;
        }

        if (blockedCount) {
            blockedCount.textContent =
                blocked.length;
        }

        if (completedCount) {
            completedCount.textContent =
                completed.length;
        }

        if (kanbanMessage) {
            kanbanMessage.textContent =
                `${data.totalActions || 0} action(s) on board.`;
        }

    } catch (error) {
        console.error(
            "Kanban error:",
            error
        );

        if (
            kanbanMessage
        ) {
            kanbanMessage.textContent =
                "Could not connect to the server.";
        }
    }
}


/* =========================
   PAGE SETUP
========================= */

const dashboardPage =
    byId(
        "meetingsThisMonth"
    );

if (dashboardPage) {
    if (requireAuth()) {
        loadDashboardStats();
        loadDashboardOverview();
        loadDashboardCharts();
    }
}


const meetingsPage =
    byId("meetingsList");

if (meetingsPage) {
    if (requireAuth()) {
        loadMeetings();
    }
}


const meetingDetailPage =
    byId(
        "meetingDetailContent"
    );

if (meetingDetailPage) {
    if (requireAuth()) {
        loadMeetingDetail();
        loadMeetingDecisions();
        loadMeetingParticipants();
    }
}


const decisionsPage =
    byId("decisionsList");

if (decisionsPage) {
    if (requireAuth()) {
        loadDecisionsPage();
    }
}


const actionsPage =
    byId("actionsList");

if (actionsPage) {
    if (requireAuth()) {
        loadResponsibleFilterOptions();
        loadActionsPage();
    }
}


const kanbanPage =
    byId("kanbanTodoList");

if (kanbanPage) {
    if (requireAuth()) {
        loadKanban();
    }
}