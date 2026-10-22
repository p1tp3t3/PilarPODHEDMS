# PilarPODHEDMS

**Pilar Prefect of Discipline of the Higher Education Department Management System**

> 🚧 **Status: Under Development.** PilarPODHEDMS is still actively being built and refined. Features, modules, and workflows described in this document may change, and some functionality may not yet be fully implemented or stable.

## About the System

PilarPODHEDMS is a centralized management system designed to support and streamline the monitoring, documentation, processing, and management of student discipline-related records and activities within the Higher Education Department. The system provides a structured platform for the Prefect of Discipline and authorized personnel to manage various student-related cases and transactions, including complaints, referrals, absent forms, violations, appointments, call-ins, and gate passes.

PilarPODHEDMS provides a centralized repository for student discipline-related information, allowing authorized personnel to efficiently record, monitor, update, retrieve, and manage records. It also includes an archival mechanism for preserving historical records and documents for future reference, monitoring, verification, and reporting.

In addition to its management and record-keeping functions, PilarPODHEDMS incorporates Machine Learning components — including a Natural Language Processing (NLP) technique — to provide decision-support features:

- A **Logistic Regression** model analyzes a student's historical violation records and classifies whether the student is likely or unlikely to commit the same type of violation again.
- A **Word2Vec**-based text analysis component analyzes the context of the reason provided in a complaint and identifies potentially related violations by comparing the complaint with the available violation list.

> These AI-assisted features are designed to provide supplementary information to authorized personnel and do not automatically determine disciplinary actions, sanctions, case classifications, or case outcomes.

PilarPODHEDMS integrates student discipline management, incident and transaction processing, record keeping, archival management, notifications, reporting, natural language processing, and predictive analytics into a single platform — providing a structured approach to the management of higher education student discipline records and activities.

## Table of Contents

- [System Modules](#system-modules)
- [Artificial Intelligence and Machine Learning Components](#artificial-intelligence-and-machine-learning-components)
- [Archival Management](#archival-management)
- [Key Features](#key-features)
- [System Workflow](#system-workflow)
- [Purpose of the System](#purpose-of-the-system)
- [Intended Users](#intended-users)
- [Messaging Rules](#messaging-rules)
- [Privacy and Security](#privacy-and-security)
- [Scheduled Tasks](#scheduled-tasks)
- [Technology](#technology)
- [Getting Started (Local Development)](#getting-started-local-development)
- [AI/ML Data Flow](#aiml-data-flow)
- [Disclaimer](#disclaimer)

## System Modules

### 1. User Module

The User Module manages the users who interact with PilarPODHEDMS. It handles user accounts, authentication, user information, roles, and access permissions, ensuring that users can access the functions and information appropriate to their assigned roles.

**Main Functions**

- User account management
- User authentication
- Role management
- Access control
- User information management
- Account status management
- User activity management

### 2. Incident Module

The Incident Module manages student discipline-related incidents and cases. It covers the recording and processing of complaints, referrals, and absent forms.

The module allows authorized personnel to record incidents, review submitted information, monitor case status, and maintain historical records. It also supports the archival of completed or previous incident records for future reference.

The Incident Module integrates the Word2Vec-based text analysis component to assist authorized personnel in identifying potentially related violations based on the reason or description provided in a complaint.

The Prefect of Discipline can file a complaint or referral on someone's behalf (for example, for a student or an outside complainant), and can issue absent forms and gate passes directly. In each case the system records which prefect filed it, shown as **"Filed By (Prefect)"** in the prefect's tables and on the record itself. Pending complaints can be approved in bulk.

**Main Functions**

- Complaint management
- Referral management
- Absent form management
- Filing on behalf of a complainant or referrer (tracked per prefect)
- Bulk approval of pending complaints
- Incident recording
- Incident monitoring
- Case status management
- Incident archiving
- Complaint context analysis
- Related violation identification

### 3. Violation Module

The Violation Module manages the different violation types and student violation records maintained by the system. It allows authorized personnel to document violations committed by students and maintain their disciplinary history.

The module also serves as an important source of data for the system's AI/ML components. Historical violation records are used by the Logistic Regression model to classify whether a student is likely or unlikely to commit the same type of violation again. The violation list also serves as a reference for the Word2Vec component when analyzing complaint descriptions and identifying potentially related violations.

Violation Management is a group of pages:

| Page | What it does |
| --- | --- |
| **Violations** | The violation list — each with its keywords (picked from existing keywords or newly added) and its penalty for each offense level (1st to 6th offense). |
| **Penalties** | The penalty list with its handbook reference numbers (e.g. 1.1 Oral Warning). |
| **Student Violations** | Students with resolved violations, their total violations and how many violations they have **repeated** (prefect only). |
| **Access Requests / Edit Access** | Requests to change the violation and penalty lists. |

A student's violation page shows each violation once, with how many times it occurred and the penalty for every occurrence (numbered by date along the violation's penalty ladder), plus a **Behavioural Analysis** tab with the repeat-violation prediction.

**Main Functions**

- Violation list management
- Penalty ladder per offense level, with reference numbers
- Violation recording
- Student violation history
- Repeated violation tracking
- Violation monitoring
- Violation classification
- Violation record archiving
- Data preparation for predictive analysis
- Reference data for complaint analysis

### 4. Appointment Module

The Appointment Module manages appointments between students and the Prefect of Discipline or other authorized personnel. It provides a structured process for scheduling and maintaining appointment records, allowing authorized personnel to monitor scheduled appointments and their corresponding status.

The prefect can also set an appointment straight from a student's violation page when the model flags the student as likely to repeat a violation (an early-intervention consultation). Students are reminded of upcoming appointments automatically (see [Scheduled Tasks](#scheduled-tasks)).

**Main Functions**

- Appointment creation
- Appointment scheduling
- Early-intervention appointments from the violation page
- Automatic appointment reminders
- Appointment monitoring
- Appointment status management
- Appointment history
- Appointment record keeping

### 5. Gate Pass Module

The Gate Pass Module manages student gate pass requests and records. It provides a centralized process for recording, monitoring, and managing gate pass transactions.

Students are notified automatically before an approved gate pass expires, and expired gate passes are archived on their own.

**Main Functions**

- Gate pass requests
- Gate pass issuing by the prefect
- Automatic expiry reminders
- Gate pass recording
- Gate pass monitoring
- Gate pass status management
- Gate pass history
- Gate pass record keeping

### 6. Notification Module

The Notification Module manages system-generated notifications and updates. It provides users with relevant information regarding incidents, appointments, requests, and other system activities, helping ensure that users are informed of important updates and actions that require their attention.

Notifications appear live (through Laravel Reverb). Scheduled reminders are sent in batches through the queue. Notification links carry encrypted ids, and a user can only ever open their own notifications.

**Main Functions**

- System notifications
- Live (real-time) notifications
- Scheduled reminders (appointments, gate pass expiry)
- Incident-related notifications
- Appointment notifications
- Request updates
- Status notifications
- Notification history

### 7. Report Module

The Report Module provides tools for generating reports based on information stored within the system. It allows authorized personnel to review and summarize discipline-related records for documentation, monitoring, and administrative purposes.

Reports is a group of pages. For the prefect: **Incident**, **Violation**, **Tardy**, **Appointment** and **Gate Pass** reports, an **Analytical Report**, **Saved Filters** and **Generated Reports**. For the IT admin: **Statistics** and **Action Log**.

Each report page has three tabs:

| Tab | What it shows |
| --- | --- |
| **Records** | The report's records, filtered by date range or school year/semester. |
| **Statistics** | Totals and charts for those same records (e.g. by type, by program, by month). |
| **Generate Report** | That report type's saved filters, each ready to generate as a PDF or Excel file. |

Saved filters are created and managed on the Saved Filters page. Generated files are queued and listed on the Generated Reports page for viewing and download.

**Main Functions**

- Incident reports
- Violation reports
- Student disciplinary history
- Appointment reports
- Gate pass reports
- Statistical summaries
- Record-based reporting
- Historical record reporting
- Saved report filters
- Queued PDF / Excel report generation

### 8. System Administrator Module

The System Administrator Module manages system-level configuration, maintenance, and administrative functions. It provides authorized system administrators with tools for managing system settings, user access, configurations, and other requirements necessary for the proper operation and maintenance of PilarPODHEDMS.

It also includes a **Model Training** page for the two AI/ML models: retraining the repeat-violation model, its cross-validation results, confusion matrix, ROC curve and calibration, and rebuilding the complaint analyzer.

**Main Functions**

- System configuration
- User and role administration
- AI/ML model training and evaluation
- Access management
- System settings
- Maintenance functions
- Administrative controls
- System monitoring
- System data management

## Artificial Intelligence and Machine Learning Components

PilarPODHEDMS incorporates two AI/ML-based components that serve different purposes in student discipline management:

```
                         PilarPODHEDMS
                              │
                     AI / ML COMPONENTS
                              │
                 ┌────────────┴────────────┐
                 │                         │
          Logistic Regression           Word2Vec
                 │                         │
         Violation History        Complaint Reason/Context
                 │                         │
                 ▼                         ▼
       Repeat Violation Prediction   Context Analysis
                 │                         │
                 ▼                         ▼
      Likely to Commit /           Related Violations
      Unlikely to Commit           from Violation List
```

### 1. Logistic Regression — Repeat Violation Prediction

The Logistic Regression model is used to analyze a student's historical violation records and classify whether the student is likely to commit or unlikely to commit the same type of violation again.

The model uses previously recorded violation information to identify patterns associated with repeated violations. After analyzing the available historical records, the system generates a binary classification result.

**Prediction Outputs**

| Output                       | Meaning                                                                                                                                                                      |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Likely to Commit**   | Based on the available historical violation records and the patterns learned by the model, the student is classified as likely to commit the same type of violation again.   |
| **Unlikely to Commit** | Based on the available historical violation records and the patterns learned by the model, the student is classified as unlikely to commit the same type of violation again. |

**General Process**

```
Student Violation Records
          │
          ▼
Historical Data Preparation
          │
          ▼
Logistic Regression Model
          │
          ▼
   Pattern Analysis
          │
          ▼
 Binary Classification
          │
       ┌──┴───┐
       │      │
       ▼      ▼
    Likely  Unlikely
   to Commit to Commit
```

The prediction is intended to provide supporting information for authorized personnel when monitoring students with previous violation records. It does not automatically determine whether a student will commit a future violation and does not independently impose disciplinary action.

**Watch List.** The prefect's dashboard has a **Watch List** of currently enrolled students whom the model classifies as likely to repeat a violation, highest probability first. Each entry links to the student's Behavioural Analysis for that violation. The list is scored in one batch request and cached for a few minutes.

> The model is currently trained on a generated dataset that follows the school's own violation rules (offense levels per violation, recency of offenses). Retraining it on real, resolved cases over time would make its predictions reflect actual student behaviour.

### 2. Word2Vec — Complaint Context and Related Violation Identification

PilarPODHEDMS also incorporates Word2Vec, a Machine Learning technique used for Natural Language Processing (NLP), for analyzing the textual content of a complainant's reason or description.

Word2Vec represents words as numerical vectors based on their contextual relationships. In PilarPODHEDMS, this capability is used to analyze the context of a complaint and compare it with the descriptions or contextual information associated with the violations maintained in the system.

When a complaint is submitted, the system processes the complainant's reason and analyzes its semantic context. The resulting representation is compared with the available violation list to identify potentially related violations or incidents.

**General Process**

```
     Complaint Reason
            │
            ▼
      Text Processing
            │
            ▼
Word2Vec Context Analysis
            │
            ▼
Semantic Similarity Comparison
            │
            ▼
 System Violation List
            │
            ▼
Potentially Related Violations
            │
            ▼
Displayed to Authorized Personnel
```

**Example**

A complaint may contain a reason such as:

> "The student threatened another student during an argument."

The system analyzes the context of the complaint and compares it with the available violation list. Based on the semantic similarity between the complaint and the violation descriptions, the system may identify potentially related violations such as:

- Threatening
- Harassment
- Bullying
- Physical Altercation
- Other related violations

The displayed results serve as possible related violations for reference and do not automatically determine the final classification or outcome of the complaint.

### AI/ML Component Comparison

| Component                     | Purpose                                                   | Input                                               | Output                                   |
| ----------------------------- | --------------------------------------------------------- | --------------------------------------------------- | ---------------------------------------- |
| **Logistic Regression** | Predict potential repeat violation                        | Student's historical violation records              | Likely to Commit / Unlikely to Commit    |
| **Word2Vec**            | Analyze complaint context and identify related violations | Complainant's reason/description and violation list | Potentially related violations/incidents |

The two components perform different functions within PilarPODHEDMS. Logistic Regression focuses on predicting whether a student is likely or unlikely to repeat the same violation based on historical records, while Word2Vec focuses on understanding the contextual similarity of complaint descriptions and identifying potentially related violations from the system's violation list.

## Archival Management

PilarPODHEDMS includes an archival mechanism for preserving historical discipline-related records and documents.

Archived records may include previously processed incidents and other applicable disciplinary documents. The archival feature helps maintain historical information for future reference, record verification, monitoring, reporting, and potential data analysis.

The archive provides a separate means of preserving records without removing their historical information from the system.

## Key Features

- Student user management
- Role-based access control
- Authentication and authorization
- Complaint management
- Referral management
- Absent form management
- Violation management
- Student violation history
- Appointment management
- Call-in management
- Gate pass management
- System notifications
- Report generation
- Historical record archiving
- Complaint context analysis
- Related violation identification
- Logistic Regression-based prediction
- Early-intervention Watch List
- Word2Vec-based semantic analysis
- Semantic similarity matching
- Report statistics and saved report filters
- Role-based messaging
- Scheduled reminders (appointments, gate pass expiry)
- Centralized discipline record management

## System Workflow

```
                         PilarPODHEDMS
                              │
                              ▼
                         User Module
                              │
                              ▼
                      Incident / Transaction
                              │
              ┌───────────────┼───────────────┐
              │               │               │
              ▼               ▼               ▼
         Complaints        Referrals      Absent Forms
              │
              ▼
       Word2Vec Analysis
              │
              ▼
    Potentially Related Violations
              │
              ▼
       Violation Module
              │
              ▼
       Violation History
              │
              ▼
    Logistic Regression Model
              │
      ┌───────┴────────┐
      │                │
      ▼                ▼
 Likely to          Unlikely to
   Commit              Commit
      │                │
      └────────┬───────┘
               ▼
      Monitoring / Reports
               │
               ▼
           Archiving
```

## Purpose of the System

The primary purpose of PilarPODHEDMS is to provide a centralized, organized, and structured platform for managing student discipline-related activities and records within the Higher Education Department.

By integrating incident management, violation records, appointments, call-ins, gate passes, notifications, reporting, archival capabilities, and AI/ML-assisted analysis, the system provides authorized personnel with tools for efficiently managing and monitoring student disciplinary information.

The integration of Logistic Regression allows the system to classify whether a student is likely to commit or unlikely to commit the same violation again based on historical violation records. Meanwhile, the Word2Vec component assists in analyzing the context of complaint reasons and identifying potentially related violations from the system's violation list.

Together, these features support a more organized and data-assisted approach to student discipline management while keeping the final assessment, case classification, disciplinary actions, and interventions under the responsibility of authorized personnel.

## Intended Users

PilarPODHEDMS is intended for authorized personnel involved in the management, processing, monitoring, and administration of student discipline-related activities within the Higher Education Department.

Access to system functions and records is controlled according to the user's assigned role and permissions. The system defines the following user roles:

| Role                                        | Description                                                                                                                                                                                                                  |
| ------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Super Admin (IT Admin)**            | Manages system-level configuration, user accounts, and overall administration of PilarPODHEDMS.                                                                                                                              |
| **Sub Admin (Prefect of Discipline)** | The primary user of the system — responsible for managing, monitoring, and processing student discipline-related cases, including complaints, referrals, absent forms, violations, appointments, call-ins, and gate passes. |
| **Teaching Staff**                    | Involved in submitting or handling referrals and other discipline-related transactions concerning students under their supervision.                                                                                          |
| **Non-Teaching Staff**                | Participates in discipline-related processes and transactions as authorized by their role.                                                                                                                                   |
| **Student**                           | The subject of discipline-related records — may file complaints, view their own case status, and receive notifications relevant to their records.                                                                           |
| **Parent**                            | May monitor and receive updates regarding their child's discipline-related records and case status.                                                                                                                          |

## Messaging Rules

Users can message each other directly in the built-in messenger, within these rules (each rule works both ways):

| User | Can message |
| --- | --- |
| **IT Admin** | Everyone |
| **Prefect** | Everyone except parents |
| **Program Head** | The students and teaching staff of the program(s) they head, the Prefect and the IT Admin |
| **Teaching Staff** | Their program head, the Prefect and the IT Admin |
| **Student** | Their program head, the Prefect and the IT Admin |
| **Non-Teaching Staff** | The Prefect and the IT Admin |
| **Parent** | The IT Admin |

## Privacy and Security

- **Role-based access.** Pages and actions are restricted by role, and records such as complaints and notifications can only be opened by the people they concern.
- **Encrypted ids.** Record and user ids in links and requests are encrypted, never plain numbers; the server decrypts them.
- **Protected real-time channels.** Live updates (notifications, messages, progress) can only be subscribed to by a signed-in, active user who owns that channel.
- **Student photos.** A student's uploaded photo is only shown to the Prefect, the IT Admin and teaching staff of the student's own program. Other students, parents and non-teaching staff see the default avatar.
- **Data kept from the IT Admin.** Disciplinary details such as which students have violations, and the content of complaints, are not shown to the IT Admin, who manages the system rather than cases.

## Scheduled Tasks

These run automatically through Laravel's scheduler:

| Task | When | What it does |
| --- | --- | --- |
| Appointment reminders | Hourly | Reminds students of appointments in the next 24 hours (once per appointment) |
| Gate pass expiry reminders | Daily, 08:00 | Notifies students whose approved gate pass expires within 24 hours |
| Archive expired gate passes | Daily, 00:05 | Moves expired gate passes to the archive |
| Next school year | Daily, 00:01 | Creates the next school year when due |
| Unresolved cases summary | Daily, 08:00 | Tells the prefect about cases still open when a semester ends |
| Scheduled maintenance | Every second | Switches maintenance mode on at its scheduled time |

Reminders are sent as batches of queued jobs on the `notifications` queue.

## Technology

PilarPODHEDMS is a web-based management system with integrated Machine Learning components, including a Natural Language Processing (NLP) technique.

**Tech Stack**

| Layer | Technology |
|---|---|
| Backend Framework | Laravel 13 (PHP 8.5.12) |
| Frontend | Inertia.js 2 + React 18, MUI 7, Tailwind CSS 3 |
| Real-time | Laravel Reverb + Laravel Echo |
| Queue | Laravel queues (database driver) |
| AI/ML API | Python (Flask, scikit-learn, gensim) |
| Database | MySQL |
| Reports | DomPDF (PDF), Laravel Excel (Excel) |

**Core Technologies**

- Web-based management system built on Laravel 13 with Inertia.js and React
- Python-powered AI/ML API service
- MySQL relational database
- Machine Learning — Logistic Regression (predictive classification)
- Machine Learning (NLP) — Word2Vec (semantic/contextual text analysis)
- Semantic similarity analysis
- Role-based access control
- Predictive analytics
- Centralized record management

## Getting Started (Local Development)

**Requirements:** PHP 8.5.12, Composer, Node.js, MySQL, and Python 3 for the AI/ML API.

```bash
# 1. Install dependencies
composer install
npm install

# 2. Configure the app
cp .env.example .env          # then set DB_*, REVERB_*, mail and the Python API settings
php artisan key:generate
php artisan migrate

# 3. Run the app (each in its own terminal)
php artisan serve
npm run dev
php artisan reverb:start                              # real-time notifications and chat
php artisan queue:work --queue=notifications,default  # reminders, reports, CSV imports
php artisan schedule:work                             # the scheduled tasks above

# 4. Run the AI/ML API (from python-api/)
pip install -r requirements.txt
PYTHONUTF8=1 PYTHONIOENCODING=utf-8 python main.py
```

Notes:

- The queue worker must include the `notifications` queue, or reminders and other notifications will wait in the queue.
- `php artisan serve` handles one request at a time, so a slow AI prediction can hold up other requests locally; setting `PHP_CLI_SERVER_WORKERS=4` lets it serve several at once.
- The app keeps working if the Python API is not running; only the AI/ML features (Behavioural Analysis, Watch List, complaint analysis) become unavailable.

## AI/ML Data Flow

The AI/ML components use different types of information depending on their intended purpose.

**Logistic Regression**

```
Historical Student Violation Records
                │
                ▼
         Data Preparation
                │
                ▼
       Logistic Regression
                │
                ▼
       Binary Classification
                │
        ┌───────┴───────┐
        ▼               ▼
 Likely to Commit   Unlikely to Commit
```

**Word2Vec**

```
   Complaint Reason
          │
          ▼
    Text Processing
          │
          ▼
Word2Vec Representation
          │
          ▼
Context / Similarity Analysis
          │
          ▼
Violation List Comparison
          │
          ▼
Potentially Related Violations
```

## Disclaimer

> The AI and Machine Learning features of PilarPODHEDMS are intended to provide supporting information based on available system records and textual data.
>
> The Logistic Regression result of "Likely to Commit" or "Unlikely to Commit" is a model-generated classification based on historical violation data and should not be interpreted as a certainty about a student's future behavior.
>
> Similarly, the Word2Vec results represent potentially related violations based on textual similarity and contextual relationships and should not be treated as an automatic determination of the appropriate violation or final case classification.
>
> **All case classifications, disciplinary actions, interventions, and final decisions remain subject to the review, assessment, and judgment of the office of the prefect of discipline.**
