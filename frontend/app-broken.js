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
                    item.IsOverdue === true ||
                    item.IsOverdue === 1 ||
                    isActionOverdue(item);

                return `
                    <div
                        class="action-summary-card"
                        data-action-id="${item.Id}"
                    >

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
                                data-action-id="${item.Id}"
                            >
                                Result & History
                            </button>

                        </div>

                        <div
                            class="action-result-history-container"
                            data-action-id="${item.Id}"
                        ></div>

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
        actionSearchFilter.value.trim()
    ) {
        params.set(
            "search",
            actionSearchFilter.value.trim()
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
    if (!actionResponsibleFilter) {
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
            handleUnauthorized(response)
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
            data.actions || []
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
            handleUnauthorized(response)
        ) {
            return;
        }

        const data =
            await response.json();

        if (!response.ok) {
            if (actionsPageMessage) {
                actionsPageMessage.textContent =
                    data.message ||
                    "Actions could not be loaded.";
            }

            return;
        }

        if (actionsPageMessage) {
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

        if (actionsPageMessage) {
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
            handleUnauthorized(response)
        ) {
            return false;
        }

        const data =
            await response.json();

        if (!response.ok) {
            alert(
                data.message ||
                "Status could not be updated."
            );

            await loadActionsPage();

            return false;
        }

        await loadActionsPage();

        return true;

    } catch (error) {
        console.error(
            "Update status error:",
            error
        );

        return false;
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
            handleUnauthorized(response)
        ) {
            return false;
        }

        const data =
            await response.json();

        if (!response.ok) {
            alert(
                data.message ||
                "Progress could not be updated."
            );

            await loadActionsPage();

            return false;
        }

        return true;

    } catch (error) {
        console.error(
            "Update progress error:",
            error
        );

        return false;
    }
}


/* =========================
   ACTION RESULT & HISTORY
========================= */

function formatActionHistoryDate(value) {
    if (!value) {
        return "-";
    }

    return new Date(value)
        .toLocaleString(
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


async function loadActionResultAndHistory(
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
        container.dataset.open ===
        "true"
    ) {
        container.innerHTML = "";

        container.dataset.open =
            "false";

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
        const [
            actionResponse,
            historyResponse
        ] =
            await Promise.all(
                [
                    fetch(
                        `${API_BASE_URL}/decisions/actions/${actionId}`,
                        {
                            headers:
                                getAuthHeaders()
                        }
                    ),

                    fetch(
                        `${API_BASE_URL}/decisions/actions/${actionId}/history`,
                        {
                            headers:
                                getAuthHeaders()
                        }
                    )
                ]
            );

        if (
            handleUnauthorized(
                actionResponse
            ) ||
            handleUnauthorized(
                historyResponse
            )
        ) {
            return;
        }

        const action =
            await actionResponse.json();

        const historyData =
            await historyResponse.json();

        if (!actionResponse.ok) {
            panel.innerHTML = `
                <p class="empty-message">
                    ${
                        action.message ||
                        "Action details could not be loaded."
                    }
                </p>
            `;

            return;
        }

        if (!historyResponse.ok) {
            panel.innerHTML = `
                <p class="empty-message">
                    ${
                        historyData.message ||
                        "Action history could not be loaded."
                    }
                </p>
            `;

            return;
        }

        const history =
            historyData.history || [];

        const completed =
            action.Status ===
            "Completed";

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

                                <div
                                    style="
                                        font-weight: 600;
                                        margin-bottom: 5px;
                                    "
                                >
                                    ${item.OldStatus || "-"}
                                    →
                                    ${item.NewStatus || "-"}
                                </div>

                                <div
                                    style="
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

            <div
                style="
                    margin-bottom: 22px;
                "
            >

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
                    !completed
                        ? `
                            <p
                                style="
                                    margin-bottom: 12px;
                                    color: #64748b;
                                    font-size: 14px;
                                "
                            >
                                Change the action status to
                                <strong>Completed</strong>
                                before saving the final result.
                            </p>
                        `
                        : ""
                }

                <textarea
                    class="action-result-input"
                    rows="4"
                    placeholder="Write what was completed and the final outcome..."
                    style="
                        width: 100%;
                        padding: 11px 12px;
                        border: 1px solid #dbe1ec;
                        border-radius: 10px;
                        resize: vertical;
                        font-family: inherit;
                        box-sizing: border-box;
                    "
                    ${completed ? "" : "disabled"}
                >${action.Result || ""}</textarea>

                <div
                    style="
                        display: flex;
                        justify-content: flex-end;
                        margin-top: 10px;
                    "
                >

                    <button
                        type="button"
                        class="page-primary-button save-action-result-button"
                        data-action-id="${actionId}"
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

                <div class="action-history-list">
                    ${historyHtml}
                </div>

            </div>
        `;

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


async function saveActionResult(
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

    const statusSelect =
        card.querySelector(
            ".action-status-select"
        );

    if (
        !textarea ||
        !message
    ) {
        return;
    }

    if (
        !statusSelect ||
        statusSelect.value !==
            "Completed"
    ) {
        message.textContent =
            "The action must be Completed before a result can be saved.";

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
                `${API_BASE_URL}/decisions/actions/${actionId}/result`,
                {
                    method: "PATCH",

                    headers:
                        getJsonAuthHeaders(),

                    body:
                        JSON.stringify({
                            result
                        })
                }
            );

        if (
            handleUnauthorized(response)
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
            "Save action result error:",
            error
        );

        message.textContent =
            "Could not connect to the server.";
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


    actionsList.addEventListener(
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

                await loadActionResultAndHistory(
                    Number(
                        detailButton
                            .dataset
                            .actionId
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

            await saveActionResult(
                Number(
                    saveButton
                        .dataset
                        .actionId
                ),
                card
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

                if (actionSearchFilter) {
                    actionSearchFilter.value = "";
                }

                if (actionStatusFilter) {
                    actionStatusFilter.value = "";
                }

                if (actionPriorityFilter) {
                    actionPriorityFilter.value = "";
                }

                if (actionResponsibleFilter) {
                    actionResponsibleFilter.value = "";
                }

                if (actionOverdueFilter) {
                    actionOverdueFilter.checked =
                        false;
                }

                loadActionsPage();
            }
        );
}