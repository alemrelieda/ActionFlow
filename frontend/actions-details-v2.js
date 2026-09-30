const ACTION_DETAILS_API = "http://localhost:3000/api";


function getDetailsHeaders(json = false) {
    const headers = {
        Authorization: `Bearer ${localStorage.getItem("token")}`
    };

    if (json) {
        headers["Content-Type"] = "application/json";
    }

    return headers;
}


function handleDetailsUnauthorized(response) {
    if (response.status !== 401) {
        return false;
    }

    localStorage.removeItem("token");
    window.location.href = "login.html";

    return true;
}


function formatHistoryDate(value) {
    if (!value) {
        return "-";
    }

    return new Date(value).toLocaleString(
        "en-US",
        {
            month: "short",
            day: "numeric",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        }
    );
}


function addDetailsButtons() {
    const cards =
        document.querySelectorAll(
            "#actionsList .action-summary-card"
        );

    cards.forEach((card) => {
        if (
            card.querySelector(
                ".action-details-button"
            )
        ) {
            return;
        }

        const statusSelect =
            card.querySelector(
                ".action-status-select"
            );

        if (!statusSelect) {
            return;
        }

        const actionId =
            statusSelect.dataset.actionId;

        const wrapper =
            document.createElement("div");

        wrapper.className =
            "action-details-wrapper";

        wrapper.innerHTML = `
            <div
                style="
                    margin-top: 16px;
                    display: flex;
                    justify-content: flex-end;
                "
            >
                <button
                    type="button"
                    class="secondary-button action-details-button"
                    data-action-id="${actionId}"
                >
                    Result & History
                </button>
            </div>

            <div
                class="action-details-panel"
                data-action-id="${actionId}"
            ></div>
        `;

        card.appendChild(wrapper);
    });
}


async function getAction(actionId) {
    const response =
        await fetch(
            `${ACTION_DETAILS_API}/decisions/actions/${actionId}`,
            {
                headers:
                    getDetailsHeaders()
            }
        );

    if (
        handleDetailsUnauthorized(response)
    ) {
        return null;
    }

    const data =
        await response.json();

    if (!response.ok) {
        throw new Error(
            data.message ||
            "Action could not be loaded."
        );
    }

    return data;
}


async function getHistory(actionId) {
    const response =
        await fetch(
            `${ACTION_DETAILS_API}/decisions/actions/${actionId}/history`,
            {
                headers:
                    getDetailsHeaders()
            }
        );

    if (
        handleDetailsUnauthorized(response)
    ) {
        return null;
    }

    const data =
        await response.json();

    if (!response.ok) {
        throw new Error(
            data.message ||
            "History could not be loaded."
        );
    }

    return data.history || [];
}


function renderDetails(
    panel,
    actionId,
    action,
    history
) {
    const historyHtml =
        history.length === 0
            ? `
                <p class="empty-message">
                    No status changes yet.
                </p>
            `
            : history
                .map(
                    (item) => `
                        <div
                            style="
                                padding: 12px 0;
                                border-bottom: 1px solid #e2e8f0;
                            "
                        >
                            <strong>
                                ${item.OldStatus || "-"}
                                →
                                ${item.NewStatus || "-"}
                            </strong>

                            <div
                                style="
                                    margin-top: 5px;
                                    font-size: 13px;
                                    color: #64748b;
                                "
                            >
                                ${item.ChangedByName || "Unknown user"}
                                •
                                ${formatHistoryDate(item.ChangedAt)}
                            </div>
                        </div>
                    `
                )
                .join("");

    panel.innerHTML = `
        <div
            style="
                margin-top: 16px;
                padding: 18px;
                border: 1px solid #e2e8f0;
                border-radius: 12px;
                background: #f8fafc;
            "
        >

            <div style="margin-bottom: 24px;">

                <span class="section-eyebrow">
                    ACTION RESULT
                </span>

                <h3
                    style="
                        margin-top: 5px;
                        margin-bottom: 12px;
                    "
                >
                    Result
                </h3>

                <p
                    style="
                        margin-bottom: 12px;
                        color: #64748b;
                        font-size: 14px;
                    "
                >
                    Current status:
                    <strong>${action.Status || "-"}</strong>
                </p>

                <textarea
                    class="action-result-input"
                    rows="4"
                    placeholder="Write the final action result..."
                    style="
                        width: 100%;
                        box-sizing: border-box;
                        padding: 11px 12px;
                        border: 1px solid #dbe1ec;
                        border-radius: 10px;
                        resize: vertical;
                        font-family: inherit;
                        background: #ffffff;
                        color: #0f172a;
                    "
                >${action.Result || ""}</textarea>

                <div
                    style="
                        margin-top: 10px;
                        display: flex;
                        justify-content: flex-end;
                    "
                >
                    <button
                        type="button"
                        class="page-primary-button save-action-result"
                        data-action-id="${actionId}"
                    >
                        Save Result
                    </button>
                </div>

                <p
                    class="action-result-message"
                    style="
                        margin-top: 10px;
                        font-size: 14px;
                    "
                ></p>

            </div>

            <div>

                <span class="section-eyebrow">
                    STATUS HISTORY
                </span>

                <h3
                    style="
                        margin-top: 5px;
                        margin-bottom: 10px;
                    "
                >
                    History
                </h3>

                ${historyHtml}

            </div>

        </div>
    `;
}


async function toggleDetails(
    actionId,
    card,
    button
) {
    const panel =
        card.querySelector(
            ".action-details-panel"
        );

    if (!panel) {
        return;
    }

    if (
        panel.dataset.open === "true"
    ) {
        panel.dataset.open = "false";
        panel.innerHTML = "";

        button.textContent =
            "Result & History";

        return;
    }

    panel.dataset.open = "true";

    button.textContent =
        "Close Details";

    panel.innerHTML = `
        <div
            style="
                margin-top: 16px;
                padding: 18px;
                border: 1px solid #e2e8f0;
                border-radius: 12px;
            "
        >
            Loading...
        </div>
    `;

    try {
        const action =
            await getAction(actionId);

        if (!action) {
            return;
        }

        const history =
            await getHistory(actionId);

        if (!history) {
            return;
        }

        const statusSelect =
            card.querySelector(
                ".action-status-select"
            );

        if (statusSelect) {
            statusSelect.value =
                action.Status;
        }

        renderDetails(
            panel,
            actionId,
            action,
            history
        );

    } catch (error) {
        console.error(
            "Action details error:",
            error
        );

        panel.innerHTML = `
            <div
                style="
                    margin-top: 16px;
                    padding: 18px;
                    border: 1px solid #e2e8f0;
                    border-radius: 12px;
                "
            >
                ${error.message}
            </div>
        `;
    }
}


async function saveResult(
    actionId,
    card
) {
    const textarea =
        card.querySelector(
            ".action-result-input"
        );

    const message =
        card.querySelector(
            ".action-result-message"
        );

    if (
        !textarea ||
        !message
    ) {
        return;
    }

    const result =
        textarea.value.trim();

    if (!result) {
        message.textContent =
            "Please write the action result.";

        return;
    }

    message.textContent =
        "Saving result...";

    try {
        const response =
            await fetch(
                `${ACTION_DETAILS_API}/decisions/actions/${actionId}/result`,
                {
                    method: "PATCH",

                    headers:
                        getDetailsHeaders(true),

                    body:
                        JSON.stringify({
                            result
                        })
                }
            );

        if (
            handleDetailsUnauthorized(response)
        ) {
            return;
        }

        const data =
            await response.json();

        if (!response.ok) {
            message.textContent =
                data.message ||
                "Result could not be saved.";

            return;
        }

        textarea.value =
            data.result || result;

        message.textContent =
            "Result saved successfully.";

    } catch (error) {
        console.error(
            "Save result error:",
            error
        );

        message.textContent =
            `Could not connect to the server: ${error.message}`;
    }
}


const actionDetailsList =
    document.getElementById(
        "actionsList"
    );


if (actionDetailsList) {
    const observer =
        new MutationObserver(() => {
            addDetailsButtons();
        });

    observer.observe(
        actionDetailsList,
        {
            childList: true
        }
    );

    addDetailsButtons();


    actionDetailsList.addEventListener(
        "click",
        async (event) => {

            const detailButton =
                event.target.closest(
                    ".action-details-button"
                );

            if (detailButton) {
                const card =
                    detailButton.closest(
                        ".action-summary-card"
                    );

                if (!card) {
                    return;
                }

                await toggleDetails(
                    Number(
                        detailButton.dataset.actionId
                    ),
                    card,
                    detailButton
                );

                return;
            }


            const saveButton =
                event.target.closest(
                    ".save-action-result"
                );

            if (!saveButton) {
                return;
            }

            const card =
                saveButton.closest(
                    ".action-summary-card"
                );

            if (!card) {
                return;
            }

            await saveResult(
                Number(
                    saveButton.dataset.actionId
                ),
                card
            );
        }
    );
}