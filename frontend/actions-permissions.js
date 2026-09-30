const ACTION_PERMISSION_API =
    "http://localhost:3000/api";


/* =========================
   TOKEN
========================= */

function getActionPermissionToken() {
    return (
        localStorage.getItem("token") ||
        localStorage.getItem("authToken")
    );
}


/* =========================
   CURRENT USER
========================= */

function getActionPermissionUserId(token) {
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

        while (payload.length % 4) {
            payload += "=";
        }

        const decoded =
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
            JSON.parse(decoded);

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
            "Action permission token error:",
            error
        );

        return null;
    }
}


/* =========================
   FIND ACTION ID
========================= */

function getPermissionActionId(card) {

    if (
        card.dataset &&
        card.dataset.actionId
    ) {
        const id =
            Number(
                card.dataset.actionId
            );

        if (
            Number.isInteger(id) &&
            id > 0
        ) {
            return id;
        }
    }

    const element =
        card.querySelector(
            "[data-action-id]"
        );

    if (!element) {
        return null;
    }

    const id =
        Number(
            element.dataset.actionId
        );

    if (
        !Number.isInteger(id) ||
        id <= 0
    ) {
        return null;
    }

    return id;
}


/* =========================
   LOAD ACTION
========================= */

async function loadPermissionAction(
    actionId,
    token
) {

    const response =
        await fetch(
            `${ACTION_PERMISSION_API}/decisions/actions/${actionId}`,
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

    return await response.json();
}


/* =========================
   HIDE DELETE
========================= */

function hideActionDeleteButton(card) {

    const buttons =
        card.querySelectorAll(
            ".delete-action-button"
        );

    buttons.forEach(
        (button) => {
            button.style.display =
                "none";
        }
    );
}


/* =========================
   READ ONLY ACTION
========================= */

function makeActionReadOnly(card) {

    /*
        Status dropdown
    */

    const selects =
        card.querySelectorAll(
            "select"
        );

    selects.forEach((select) => {
        select.disabled = true;

        select.style.cursor =
            "not-allowed";

        select.style.opacity =
            "0.65";
    });


    /*
        Progress slider
    */

    const sliders =
        card.querySelectorAll(
            'input[type="range"]'
        );

    sliders.forEach((slider) => {
        slider.disabled = true;

        slider.style.cursor =
            "not-allowed";

        slider.style.opacity =
            "0.65";
    });


    /*
        Delete kesinlikle görünmez
    */

    hideActionDeleteButton(card);
}


/* =========================
   RESULT AREA PERMISSION
========================= */

function protectResultArea(
    card,
    canEdit
) {

    const textareas =
        card.querySelectorAll(
            "textarea"
        );

    textareas.forEach(
        (textarea) => {

            if (canEdit) {
                textarea.readOnly =
                    false;

                return;
            }

            textarea.readOnly =
                true;

            textarea.style.cursor =
                "default";

            textarea.style.background =
                "#f8f9fd";
        }
    );


    const buttons =
        card.querySelectorAll(
            "button"
        );

    buttons.forEach(
        (button) => {

            const text =
                String(
                    button.textContent ||
                    ""
                )
                    .trim()
                    .toLowerCase();

            if (
                !canEdit &&
                (
                    text.includes(
                        "save result"
                    ) ||
                    text ===
                        "save"
                )
            ) {
                button.style.display =
                    "none";
            }
        }
    );
}


/* =========================
   APPLY CARD PERMISSION
========================= */

async function applyActionCardPermission(
    card,
    currentUserId,
    token
) {

    const actionId =
        getPermissionActionId(
            card
        );

    if (!actionId) {
        return;
    }

    try {

        const action =
            await loadPermissionAction(
                actionId,
                token
            );

        if (!action) {
            return;
        }

        const responsibleUserId =
            Number(
                action.ResponsibleUserId
            );

        const actionCreatedBy =
            Number(
                action.CreatedBy
            );

        /*
            Artık Action sadece meeting
            creator tarafından oluşturulabildiği
            için CreatedBy creator'ı temsil ediyor.
        */

        const isCreator =
            actionCreatedBy ===
            currentUserId;

        const isResponsible =
            responsibleUserId ===
            currentUserId;


        /*
            Creator:
            full access
        */

        if (isCreator) {
            return;
        }


        /*
            Responsible person:
            status/progress/result değiştirebilir
            fakat silemez.
        */

        if (isResponsible) {

            hideActionDeleteButton(
                card
            );

            protectResultArea(
                card,
                true
            );

            return;
        }


        /*
            Diğer meeting participant:
            sadece görüntüleme.
        */

        makeActionReadOnly(
            card
        );

        protectResultArea(
            card,
            false
        );

    } catch (error) {
        console.error(
            "Action card permission error:",
            error
        );
    }
}


/* =========================
   APPLY ALL
========================= */

async function applyActionPermissions() {

    const token =
        getActionPermissionToken();

    if (!token) {
        return;
    }

    const currentUserId =
        getActionPermissionUserId(
            token
        );

    if (!currentUserId) {
        return;
    }

    const actionsList =
        document.getElementById(
            "actionsList"
        );

    if (!actionsList) {
        return;
    }

    const cards =
        Array.from(
            actionsList.children
        );

    for (const card of cards) {

        const actionId =
            getPermissionActionId(
                card
            );

        if (!actionId) {
            continue;
        }

        await applyActionCardPermission(
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

        const actionsList =
            document.getElementById(
                "actionsList"
            );

        if (!actionsList) {
            return;
        }

        /*
            app.js kartları oluşturduktan
            sonra izinleri uygula.
        */

        setTimeout(
            applyActionPermissions,
            500
        );


        /*
            Filter / Result & History gibi
            işlemlerde DOM değişirse
            izinleri tekrar uygula.
        */

        const observer =
            new MutationObserver(
                () => {
                    setTimeout(
                        applyActionPermissions,
                        50
                    );
                }
            );

        observer.observe(
            actionsList,
            {
                childList: true,
                subtree: true
            }
        );
    }
);