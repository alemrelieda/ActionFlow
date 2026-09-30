const ACTION_DETAILS_API = "http://localhost:3000/api";


function getActionDetailsHeaders() {
    return {
        Authorization: `Bearer ${localStorage.getItem("token")}`
    };
}


function getActionDetailsJsonHeaders() {
    return {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`
    };
}


function handleActionDetailsUnauthorized(response) {
    if (response.status !== 401) {
        return false;
    }

    localStorage.removeItem("token");
    window.location.href = "login.html";

    return true;
}


function formatActionHistoryDate(value) {
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


function addResultHistoryButtons() {
    const cards =
        document.querySelectorAll(
            "#actionsList .action-summary-card"
        );

    cards.forEach((card) => {
        if (
            card.querySelector(
                ".action-detail-toggle-button"
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

        const detailArea =
            document.createElement("div");

        detailArea.className =
            "action-detail-area";

        detailArea.innerHTML = `
            <div
                style="
                    margin-top: 16px;
                    display: flex;
                    justify-content: flex-end;
                "
            >
                <button
                    type="button"
                    class="secondary-button action-detail-toggle-button"
                    data-action-id="${actionId}"
                >
                    Result & History
                </button>
            </div>

            <div
                class="action-result-history-container"
                data-action-id="${actionId}"
            ></div>
        `;

        card.appendChild(detailArea);
    });
}


async function getCurrentAction(actionId) {
    const response =
        await fetch(
            `${ACTION_DETAILS_API}/decisions/actions/${actionId}`,
            {
                headers:
                    getActionDetailsHeaders()
            }
        );

    if (
        handleActionDetailsUnauthorized(
            response
        )
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


async function getActionHistory(actionId) {
    const response =
        await fetch(
            `${ACTION_DETAILS_API}/decisions/actions/${actionId}/history`,
            {
                headers:
                    getActionDetailsHeaders()
            }
        );

    if (
        handleActionDetailsUnauthorized(
            response
        )
    ) {
        return null;
    }

    const data =
        await response.json();

    if (!response.ok) {
        throw new Error(
            data.message ||
            "Action history could not be loaded."
        );
    }

    return data.history || [];
}


function renderActionDetailsPanel(
    panel,
    actionId,
    action,
    history
) {
    const completed =
        action.Status === "Completed";

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
                                ${formatActionHistoryDate(item.ChangedAt)}
                            </div>
                        </div>
                    `
                )
                .join("");

    panel.innerHTML = `
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

            ${
                completed
                    ? `
                        <p
                            style="
                                margin-bottom: 12px;
                                color: #64748b;
                                font-size: 14px;
                            "
                        >
                            This action is completed. You can save its final result.
                        </p>
                    `
                    : `
                        <p
                            style="
                                margin-bottom: 12px;
                                color: #64748b;
                                font-size: 14px;
                            "
                        >
                            Change the action status to
                            <strong>Completed</strong>
                            before saving the result.
                        </p>
                    `
            }

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

                    ${
                        completed
                            ? `
                                background: #ffffff;
                                color: #0f172a;
                                cursor: text;
                            `
                            : `
                                background: #eef2f7;
                                color: #94a3b8;
                                cursor: not-allowed;
                            `
                    }
                "
                ${completed ? "" : "disabled"}
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
                    class="page-primary-button save-action-result-button"
                    data-action-id="${actionId}"
                    style="
                        ${
                            completed
                                ? `
                                    opacity: 1;
                                    cursor: pointer;
                                `
                                : `
                                    opacity: 0.45;
                                    cursor: not-allowed;
                                    pointer-events: none;
                                `
                        }
                    "
                    ${completed ? "" : "disabled"}
                >
                    Save Result
                </button>
            </div>

            <p
                class="action-result-message"
                style="
                    margin-top: 8px;
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
    `;
}


async function openActionDetails(
    actionId,
    card,
    button
) {
    const container =
        card.querySelector(
            ".action-result-history-container"
        );

    if (!container) {
        return;
    }

    if (
        container.dataset.open === "true"
    ) {
        container.innerHTML = "";
        container.dataset.open = "false";

        button.textContent =
            "Result & History";

        return;
    }

    container.dataset.open =
        "true";

    button.textContent =
        "Close Details";

    container.innerHTML = `
        <div
            class="action-result-history-panel"
            style="
                margin-top: 16px;
                padding: 18px;
                border: 1px solid #e2e8f0;
                border-radius: 12px;
                background: #f8fafc;
            "
        >
            <p class="empty-message">
                Loading action details...
            </p>
        </div>
    `;

    const panel =
        container.querySelector(
            ".action-result-history-panel"
        );

    try {
        const action =
            await getCurrentAction(
                actionId
            );

        if (!action) {
            return;
        }

        const history =
            await getActionHistory(
                actionId
            );

        if (!history) {
            return;
        }

        /*
            Karttaki dropdown eski kaldıysa,
            backend'deki gerçek status ile eşitle.
        */
        const statusSelect =
            card.querySelector(
                ".action-status-select"
            );

        if (statusSelect) {
            statusSelect.value =
                action.Status;
        }

        renderActionDetailsPanel(
            panel,
            actionId,
            action,
            history
        );

    } catch (error) {
        console.error(
            "Action detail error:",
            error
        );

        panel.innerHTML = `
            <p class="empty-message">
                Could not connect to the server.
            </p>
        `;
    }
}


async function saveActionResultFromDetails(
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

    message.textContent =
        "Checking action status...";

    try {
        /*
            DOM'daki dropdown'a güvenmiyoruz.
            Gerçek status'u backend'den tekrar alıyoruz.
        */
        const action =
            await getCurrentAction(
                actionId
            );

        if (!action) {
            return;
        }

        if (
            action.Status !==
            "Completed"
        ) {
            message.textContent =
                "The action must be Completed before saving a result.";

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

        const response =
            await fetch(
                `${ACTION_DETAILS_API}/decisions/actions/${actionId}/result`,
                {
                    method: "PATCH",

                    headers:
                        getActionDetailsJsonHeaders(),

                    body:
                        JSON.stringify({
                            result
                        })
                }
            );

        if (
            handleActionDetailsUnauthorized(
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
                "Result could not be saved.";

            return;
        }

        textarea.value =
            data.result ||
            result;

        message.textContent =
            "Result saved successfully.";

    } catch (error) {
        console.error(
            "Save result error:",
            error
        );

        message.textContent =
            "Could not connect to the server.";
    }
}


const actionDetailsList =
    document.getElementById(
        "actionsList"
    );


if (actionDetailsList) {
    const observer =
        new MutationObserver(() => {
            addResultHistoryButtons();
        });

    observer.observe(
        actionDetailsList,
        {
            childList: true,
            subtree: true
        }
    );

    addResultHistoryButtons();


    actionDetailsList.addEventListener(
        "click",
        async (event) => {
            const detailButton =
                event.target.closest(
                    ".action-detail-toggle-button"
                );

            if (detailButton) {
                const card =
                    detailButton.closest(
                        ".action-summary-card"
                    );

                if (!card) {
                    return;
                }

                await openActionDetails(
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
                    ".save-action-result-button"
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

            await saveActionResultFromDetails(
                Number(
                    saveButton.dataset.actionId
                ),
                card
            );
        }
    );
}