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
- [Technology](#technology)
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

**Main Functions**

- Complaint management
- Referral management
- Absent form management
- Incident recording
- Incident monitoring
- Case status management
- Incident archiving
- Complaint context analysis
- Related violation identification

### 3. Violation Module

The Violation Module manages the different violation types and student violation records maintained by the system. It allows authorized personnel to document violations committed by students and maintain their disciplinary history.

The module also serves as an important source of data for the system's AI/ML components. Historical violation records are used by the Logistic Regression model to classify whether a student is likely or unlikely to commit the same type of violation again. The violation list also serves as a reference for the Word2Vec component when analyzing complaint descriptions and identifying potentially related violations.

**Main Functions**

- Violation list management
- Violation recording
- Student violation history
- Violation monitoring
- Violation classification
- Violation record archiving
- Data preparation for predictive analysis
- Reference data for complaint analysis

### 4. Appointment Module

The Appointment Module manages appointments between students and the Prefect of Discipline or other authorized personnel. It provides a structured process for scheduling and maintaining appointment records, allowing authorized personnel to monitor scheduled appointments and their corresponding status.

**Main Functions**

- Appointment creation
- Appointment scheduling
- Appointment monitoring
- Appointment status management
- Appointment history
- Appointment record keeping

### 5. Gate Pass Module

The Gate Pass Module manages student gate pass requests and records. It provides a centralized process for recording, monitoring, and managing gate pass transactions.

**Main Functions**

- Gate pass requests
- Gate pass recording
- Gate pass monitoring
- Gate pass status management
- Gate pass history
- Gate pass record keeping

### 6. Notification Module

The Notification Module manages system-generated notifications and updates. It provides users with relevant information regarding incidents, appointments, requests, and other system activities, helping ensure that users are informed of important updates and actions that require their attention.

**Main Functions**

- System notifications
- Incident-related notifications
- Appointment notifications
- Request updates
- Status notifications
- Notification history

### 7. Report Module

The Report Module provides tools for generating reports based on information stored within the system. It allows authorized personnel to review and summarize discipline-related records for documentation, monitoring, and administrative purposes.

Reports may include information related to student incidents, violations, appointments, gate passes, and other relevant disciplinary activities.

**Main Functions**

- Incident reports
- Violation reports
- Student disciplinary history
- Appointment reports
- Gate pass reports
- Statistical summaries
- Record-based reporting
- Historical record reporting

### 8. System Administrator Module

The System Administrator Module manages system-level configuration, maintenance, and administrative functions. It provides authorized system administrators with tools for managing system settings, user access, configurations, and other requirements necessary for the proper operation and maintenance of PilarPODHEDMS.

**Main Functions**

- System configuration
- User and role administration
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
- Word2Vec-based semantic analysis
- Semantic similarity matching
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

## Technology

PilarPODHEDMS is a web-based management system with integrated Machine Learning components, including a Natural Language Processing (NLP) technique.

**Tech Stack**

| Layer | Technology |
|---|---|
| Backend Framework | Laravel 13 |
| Frontend | Inertia.js + React |
| AI/ML API | Python |
| Database | MySQL |

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
