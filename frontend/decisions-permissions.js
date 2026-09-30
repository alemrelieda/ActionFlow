const DECISION_PERMISSION_API =
    "http://localhost:3000/api";


/* =========================
   GET TOKEN
========================= */

function getDecisionPermissionToken() {
    return (
        localStorage.getItem("token") ||
        localStorage.getItem("authToken")
    );
}


/* =========================
   READ CURRENT USER ID
========================= */

function getDecisionPermissionUserId(token) {
    try {
        const parts =
            token.split(".");

        if (parts.length !== 3) {
            return null;
        }

        let payload =
            parts[1]
                .replace(/-/g, "+")
                .replace(/_/g, "/");

        while (
            payload.length % 4
        ) {
            payload += "=";
        }

        const decodedPayload =
            decodeURIComponent(
                atob(payload)
                    .split("")
                    .map((character) => {
                        return (
                            "%" +
                            (
                                "00" +
                                character
                                    .charCodeAt(0)
                                    .toString(16)
                            ).slice(-2)
                        );
                    })
                    .join("")
            );

        const data =
            JSON.parse(
                decodedPayload
            );

        const userId =
            Number(
                data.userId ||
                data.id ||
                data.Id
            );

        if (
            !Number.isInteger(userId) ||
            userId <= 0
        ) {
            return null;
        }

        return userId;

    } catch (error) {
        console.error(
            "Decision permission token error:",
            error
        );

        return null;
    }
}


/* =========================
   MEETING CACHE
========================= */

const decisionMeetingCache =
    new Map();


/* =========================
   GET MEETING ID FROM CARD
========================= */

function getDecisionMeetingId(card) {

    const viewMeetingButton =
        card.querySelector(
            ".view-decision-meeting-button[data-meeting-id]"
        );

    if (!viewMeetingButton) {
        return null;
    }

    const meetingId =
        Number(
            viewMeetingButton.dataset
                .meetingId
        );

    if (
        !Number.isInteger(meetingId) ||
        meetingId <= 0
    ) {
        return null;
    }

    return meetingId;
}


/* =========================
   LOAD MEETING
========================= */

async function loadDecisionPermissionMeeting(
    meetingId,
    token
) {

    if (
        decisionMeetingCache.has(
            meetingId
        )
    ) {
        return decisionMeetingCache.get(
            meetingId
        );
    }

    const response =
        await fetch(
            `${DECISION_PERMISSION_API}/meetings/${meetingId}`,
            {
                headers: {
                    Authorization:
                        `Bearer ${token}`
                }
            }
        );

    if (!response.ok) {
        return null;
    }

    const data =
        await response.json();

    const meeting =
        data.meeting || null;

    if (meeting) {
        decisionMeetingCache.set(
            meetingId,
            meeting
        );
    }

    return meeting;
}


/* =========================
   MAKE DECISION READ ONLY
========================= */

function makeDecisionReadOnly(card) {

    /*
        Implementation status dropdown
        participant için gizlenir.

        Kartın sol üstündeki badge
        status bilgisini zaten gösteriyor.
    */

    const statusSelect =
        card.querySelector(
            ".decision-implementation-status-select"
        );

    if (statusSelect) {
        statusSelect.style.display =
            "none";
    }


    /*
        Final Result görünmeye devam eder
        fakat değiştirilemez.
    */

    const resultTextarea =
        card.querySelector(
            ".decision-final-result-input"
        );

    if (resultTextarea) {

        resultTextarea.readOnly =
            true;

        resultTextarea.style.cursor =
            "default";

        resultTextarea.style.background =
            "#f8f9fd";
    }


    /*
        Save Result butonu participant
        için gizlenir.
    */

    const saveResultButton =
        card.querySelector(
            ".save-decision-result-button"
        );

    if (saveResultButton) {
        saveResultButton.style.display =
            "none";
    }
}


/* =========================
   APPLY CARD PERMISSION
========================= */

async function applyDecisionCardPermission(
    card,
    currentUserId,
    token
) {

    const meetingId =
        getDecisionMeetingId(
            card
        );

    if (!meetingId) {
        return;
    }

    try {

        const meeting =
            await loadDecisionPermissionMeeting(
                meetingId,
                token
            );

        if (!meeting) {
            return;
        }

        const meetingCreatorId =
            Number(
                meeting.CreatedBy
            );

        const isMeetingCreator =
            meetingCreatorId ===
            currentUserId;

        if (!isMeetingCreator) {
            makeDecisionReadOnly(
                card
            );
        }

    } catch (error) {
        console.error(
            "Decision permission error:",
            error
        );
    }
}


/* =========================
   APPLY ALL PERMISSIONS
========================= */

async function applyDecisionPermissions() {

    const token =
        getDecisionPermissionToken();

    if (!token) {
        return;
    }

    const currentUserId =
        getDecisionPermissionUserId(
            token
        );

    if (!currentUserId) {
        return;
    }

    const decisionsList =
        document.getElementById(
            "decisionsList"
        );

    if (!decisionsList) {
        return;
    }

    const decisionCards =
        decisionsList.querySelectorAll(
            ".decision-detail-card"
        );

    for (
        const card
        of decisionCards
    ) {
        await applyDecisionCardPermission(
            card,
            currentUserId,
            token
        );
    }
}


/* =========================
   INITIALIZE
========================= */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        const decisionsList =
            document.getElementById(
                "decisionsList"
            );

        if (!decisionsList) {
            return;
        }

        setTimeout(
            applyDecisionPermissions,
            500
        );

        const observer =
            new MutationObserver(
                () => {
                    setTimeout(
                        applyDecisionPermissions,
                        50
                    );
                }
            );

        observer.observe(
            decisionsList,
            {
                childList: true,
                subtree: true
            }
        );
    }
);