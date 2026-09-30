# ActionFlow

## Meeting Decision & Follow-up Management System

ActionFlow is a full-stack web application designed to track decisions made during meetings and ensure that those decisions are actually followed through.

The main workflow is:

**Meeting → Decision → Action → Responsible Person → Deadline → Progress → Result**

## Project Purpose

In many workplaces, decisions are made during meetings, but their implementation can become difficult to track afterwards.

ActionFlow helps teams answer questions such as:

- What was decided?
- Who is responsible?
- What is the deadline?
- What is the current progress?
- Has the action been completed?
- Was the decision actually implemented?
- What was the final result?

Unlike a traditional meeting tracker, ActionFlow focuses on what happens after the meeting.

## Features

### Authentication
- User registration
- User login
- JWT-based authentication
- Password hashing with bcrypt
- Token expiration
- Protected backend routes

### Meetings
- Create meetings
- View meeting details
- Store date, time, location and notes
- Add participants
- Track participant and decision counts

### Decisions
- Create decisions from meetings
- Track implementation status
- Calculate action completion progress
- Save final decision results

Supported decision statuses:

- Not Started
- In Progress
- Partially Implemented
- Implemented
- Not Implemented

### Actions
- Create action items from decisions
- Assign a responsible person
- Set priority
- Set start date
- Set deadline
- Track progress from 0% to 100%
- Update action status
- Save action results
- Delete actions
- Detect overdue actions

Supported action statuses:

- To Do
- In Progress
- Blocked
- Completed
- Cancelled

### Status History
ActionFlow records changes in action status.

Example:

To Do → In Progress → Blocked → Completed

The system also records who changed the status and when.

### Kanban Board
Actions are organized into:

- To Do
- In Progress
- Blocked
- Completed

## Authorization

ActionFlow includes backend authorization in addition to authentication.

### Meeting Creator
The meeting creator can:

- Add participants
- Create decisions
- Create actions
- Update decision implementation status
- Save final results
- Update actions
- Delete actions

### Meeting Participant
A participant can:

- View meetings they participate in
- View meeting details
- View decisions
- View relevant actions

### Responsible Person
The responsible person can:

- Update their assigned action status
- Update progress
- Save action results
- View status history

Users cannot modify resources they are not authorized to manage.

## Technology Stack

### Frontend
- HTML
- CSS
- JavaScript
- Chart.js

### Backend
- Node.js
- Express.js
- REST API

### Database
- Microsoft SQL Server

### Security
- JWT
- bcrypt
- CORS
- Environment variables
- Authorization controls

### Development Tools
- Visual Studio Code
- SQL Server Management Studio
- PowerShell
- Git
- GitHub

## Project Structure

```text
ActionFlow/
│
├── backend/
│   ├── config/
│   ├── middleware/
│   ├── routes/
│   ├── package.json
│   └── server.js
│
├── frontend/
│   ├── app.js
│   ├── login.html
│   ├── register.html
│   ├── dashboard.html
│   ├── meetings.html
│   ├── meeting-detail.html
│   ├── decisions.html
│   ├── actions.html
│   ├── kanban.html
│   └── styles.css
│
├── database/
├── docs/
└── README.md