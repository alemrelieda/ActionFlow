const ACTION_DELETE_API =
    "http://localhost:3000/api";


function getActionFlowToken() {
    return (
        localStorage.getItem("token") ||
        localStorage.getItem("authToken")
    );
}


/* =========================
   FIND ACTION ID
========================= */

function getActionIdFromCard(card) {

    if (card.dataset.actionId) {
        return card.dataset.actionId;
    }

    const elementWithActionId =
        card.querySelector("[data-action-id]");

    if (!elementWithActionId) {
        return null;
    }

    return elementWithActionId.dataset.actionId;
}


/* =========================
   DELETE ACTION
========================= */

async function deleteAction(actionId) {

    const confirmed =
        window.confirm(
            "Are you sure you want to delete this action?"
        );

    if (!confirmed) {
        return;
    }

    const token =
        getActionFlowToken();

    if (!token) {
        alert(
            "Login token could not be found."
        );

        return;
    }

    try {

        const response =
            await fetch(
                `${ACTION_DELETE_API}/decisions/actions/${actionId}`,
                {
                    method: "DELETE",

                    headers: {
                        Authorization:
                            `Bearer ${token}`
                    }
                }
            );

        const data =
            await response.json();

        if (!response.ok) {
            throw new Error(
                data.message ||
                "Action could not be deleted."
            );
        }

        alert(
            "Action deleted successfully."
        );

        window.location.reload();

    } catch (error) {

        console.error(
            "Delete action error:",
            error
        );

        alert(
            error.message ||
            "Action could not be deleted."
        );
    }
}


/* =========================
   ADD DELETE BUTTONS
========================= */

function addDeleteButtons() {

    const actionsList =
        document.getElementById(
            "actionsList"
        );

    if (!actionsList) {
        return;
    }

    /*
        Sadece Actions listesindeki
        ANA kartları alıyoruz.

        Böylece Result & History gibi
        kartın içindeki elementlere
        ikinci Delete butonu eklenmez.
    */
    const actionCards =
        Array.from(
            actionsList.children
        );

    actionCards.forEach((card) => {

        const actionId =
            getActionIdFromCard(card);

        if (!actionId) {
            return;
        }

        /*
            Kartta zaten bizim eklediğimiz
            buton varsa tekrar ekleme.
        */
        if (
            card.querySelector(
                ":scope > .delete-action-button"
            )
        ) {
            return;
        }

        const button =
            document.createElement(
                "button"
            );

        button.type =
            "button";

        button.className =
            "delete-action-button";

        button.textContent =
            "Delete Action";

        button.style.marginTop =
            "12px";

        button.style.padding =
            "10px 14px";

        button.style.border =
            "none";

        button.style.borderRadius =
            "10px";

        button.style.cursor =
            "pointer";

        button.style.background =
            "#ef4444";

        button.style.color =
            "#ffffff";

        button.style.fontWeight =
            "600";

        button.addEventListener(
            "click",
            () => {
                deleteAction(
                    actionId
                );
            }
        );

        card.appendChild(
            button
        );
    });
}


/* =========================
   INITIALIZE
========================= */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        setTimeout(
            addDeleteButtons,
            500
        );

        const actionsList =
            document.getElementById(
                "actionsList"
            );

        if (!actionsList) {
            return;
        }

        const observer =
            new MutationObserver(
                () => {
                    addDeleteButtons();
                }
            );

        observer.observe(
            actionsList,
            {
                childList: true
            }
        );
    }
);