const KANBAN_API = "http://localhost:3000/api";


function getKanbanHeaders(json = false) {
    const headers = {
        Authorization: `Bearer ${localStorage.getItem("token")}`
    };

    if (json) {
        headers["Content-Type"] = "application/json";
    }

    return headers;
}


async function getKanbanData() {
    const response = await fetch(
        `${KANBAN_API}/decisions/actions/kanban`,
        {
            headers: getKanbanHeaders()
        }
    );

    if (response.status === 401) {
        localStorage.removeItem("token");
        window.location.href = "login.html";
        return null;
    }

    const data = await response.json();

    if (!response.ok) {
        throw new Error(
            data.message || "Kanban data could not be loaded."
        );
    }

    return data;
}


function createStatusSelect(action) {
    const select = document.createElement("select");

    select.className = "kanban-status-select";
    select.dataset.actionId = action.Id;

    select.style.marginTop = "12px";
    select.style.width = "100%";
    select.style.padding = "8px 10px";
    select.style.border = "1px solid #dbe1ec";
    select.style.borderRadius = "8px";
    select.style.background = "#ffffff";
    select.style.fontFamily = "inherit";

    const statuses = [
        "To Do",
        "In Progress",
        "Blocked",
        "Completed"
    ];

    statuses.forEach((status) => {
        const option = document.createElement("option");

        option.value = status;
        option.textContent = status;

        if (action.Status === status) {
            option.selected = true;
        }

        select.appendChild(option);
    });

    return select;
}


function attachControlsToColumn(
    containerId,
    actions
) {
    const container =
        document.getElementById(containerId);

    if (!container) {
        return;
    }

    const cards =
        container.querySelectorAll(".kanban-card");

    cards.forEach((card, index) => {
        const action = actions[index];

        if (!action) {
            return;
        }

        if (
            card.querySelector(".kanban-status-select")
        ) {
            return;
        }

        card.appendChild(
            createStatusSelect(action)
        );
    });
}


async function addKanbanControls() {
    try {
        const data = await getKanbanData();

        if (!data) {
            return;
        }

        const columns = data.columns || {};

        attachControlsToColumn(
            "kanbanTodoList",
            columns.toDo || []
        );

        attachControlsToColumn(
            "kanbanProgressList",
            columns.inProgress || []
        );

        attachControlsToColumn(
            "kanbanBlockedList",
            columns.blocked || []
        );

        attachControlsToColumn(
            "kanbanCompletedList",
            columns.completed || []
        );

    } catch (error) {
        console.error(
            "Kanban controls error:",
            error
        );
    }
}


async function updateKanbanStatus(
    actionId,
    status
) {
    const response = await fetch(
        `${KANBAN_API}/decisions/actions/${actionId}/status`,
        {
            method: "PATCH",

            headers:
                getKanbanHeaders(true),

            body:
                JSON.stringify({
                    status
                })
        }
    );

    if (response.status === 401) {
        localStorage.removeItem("token");
        window.location.href = "login.html";
        return false;
    }

    const data = await response.json();

    if (!response.ok) {
        alert(
            data.message ||
            "Status could not be updated."
        );

        return false;
    }

    return true;
}


document.addEventListener(
    "change",
    async (event) => {
        const select =
            event.target.closest(
                ".kanban-status-select"
            );

        if (!select) {
            return;
        }

        select.disabled = true;

        const success =
            await updateKanbanStatus(
                Number(select.dataset.actionId),
                select.value
            );

        if (success) {
            window.location.reload();
            return;
        }

        select.disabled = false;
    }
);


const kanbanLists = [
    "kanbanTodoList",
    "kanbanProgressList",
    "kanbanBlockedList",
    "kanbanCompletedList"
];

kanbanLists.forEach((id) => {
    const element =
        document.getElementById(id);

    if (!element) {
        return;
    }

    const observer =
        new MutationObserver(() => {
            addKanbanControls();
        });

    observer.observe(
        element,
        {
            childList: true
        }
    );
});


addKanbanControls();