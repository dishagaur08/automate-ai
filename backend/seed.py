"""
Seed data.

Runs once at startup (see main.py). If a demo user already exists,
seeding is skipped — this is safe to call on every restart.

Phase 5: all demo records are attached to a seeded demo user
(demo@automateai.app) since every Lead/Customer/Task/Approval now
requires an owner_id. This also gives new developers a ready-to-use
login without registering first.

Lead `created_at` values are deliberately spread across the last 7 days
so /api/dashboard/lead-analytics has real day-over-day variation to
aggregate, instead of every row landing on "today".
"""

from datetime import datetime, timedelta

from sqlalchemy.orm import Session

from models import AICommandLog, Approval, EmailMessage, Lead, Customer, Task, Activity, User
import os
from services.auth import hash_password

DEMO_USER_EMAIL = "demo@automateai.app"
DEMO_USER_PASSWORD = "Demo1234!"
DEMO_USER_NAME = "Aisha Khan"


def seed_if_empty(db: Session) -> None:
    if os.getenv('SEED_DEMO_DATA', 'true').strip().lower() not in {'1', 'true', 'yes', 'on'}:
        return
    existing_demo_user = db.query(User).filter(User.email == DEMO_USER_EMAIL).first()
    if existing_demo_user is not None:
        return  # already seeded

    demo_user = User(
        name=DEMO_USER_NAME,
        email=DEMO_USER_EMAIL,
        hashed_password=hash_password(DEMO_USER_PASSWORD),
    )
    db.add(demo_user)
    db.commit()
    db.refresh(demo_user)
    owner_id = demo_user.id

    now = datetime.utcnow()
    today = now.date()

    leads_data = [
        ("Rahul Sharma", "rahul.sharma@abccompany.com", "+91 98765 43210", "ABC Company", "Qualified", "Website", 0),
        ("Priya Nair", "priya.nair@fintrack.io", "+91 98111 22334", "Fintrack Ltd.", "New", "Referral", 0),
        ("Aman Verma", "aman.verma@novaretail.com", "+91 97456 11223", "Nova Retail", "Negotiation", "Cold Outreach", 1),
        ("Neha Kapoor", "neha.kapoor@brightsolutions.com", "+91 96234 55667", "Bright Solutions", "New", "Website", 1),
        ("Karan Mehta", "karan.mehta@novatech.io", "+91 99887 76655", "NovaTech", "Qualified", "Referral", 2),
        ("Sanya Malhotra", "sanya.m@nimbuscloud.com", "+91 98223 44556", "Nimbus Cloud Inc.", "New", "Website", 2),
        ("Vikram Rao", "vikram.rao@quantumworks.com", "+91 97001 22334", "Quantum Works", "Lost", "Cold Outreach", 3),
        ("Ishita Sen", "ishita.sen@brightsolutions.com", "+91 98765 11009", "Bright Solutions", "Negotiation", "Referral", 4),
        ("Arjun Nanda", "arjun.nanda@abccompany.com", "+91 91234 87654", "ABC Company", "New", "Website", 5),
        ("Divya Pillai", "divya.pillai@fintrack.io", "+91 90009 11223", "Fintrack Ltd.", "Qualified", "Website", 6),
        ("Rohan Bhatia", "rohan.b@quantumworks.com", "+91 93456 66778", "Quantum Works", "New", "Cold Outreach", 6),
    ]
    for name, email, phone, company, status, source, days_ago in leads_data:
        db.add(
            Lead(
                name=name,
                email=email,
                phone=phone,
                company=company,
                status=status,
                source=source,
                created_at=now - timedelta(days=days_ago, hours=days_ago % 5),
                owner_id=owner_id,
            )
        )

    customers_data = [
        ("ABC Company", "accounts@abccompany.com", "+91 22 4000 1000", "ABC Company", "Active"),
        ("NovaTech", "billing@novatech.io", "+91 22 4000 2000", "NovaTech", "Active"),
        ("Bright Solutions", "hello@brightsolutions.com", "+91 22 4000 3000", "Bright Solutions", "Active"),
        ("Nimbus Cloud Inc.", "team@nimbuscloud.com", "+91 22 4000 4000", "Nimbus Cloud Inc.", "Active"),
        ("Quantum Works", "ops@quantumworks.com", "+91 22 4000 5000", "Quantum Works", "Inactive"),
        ("Fintrack Ltd.", "finance@fintrack.io", "+91 22 4000 6000", "Fintrack Ltd.", "Active"),
    ]
    for name, email, phone, company, status in customers_data:
        db.add(
            Customer(
                name=name, email=email, phone=phone, company=company, status=status, owner_id=owner_id
            )
        )

    tasks_data = [
        ("Follow up with Rahul Sharma", "Pending", "High", 2),
        ("Review proposal for Nova Retail", "In Progress", "High", 3),
        ("Send customer email to ABC Company", "Completed", "Medium", -2),
        ("Prepare pricing sheet for Fintrack Ltd.", "Completed", "Medium", -1),
        ("Qualify new leads from website form", "In Progress", "Medium", 1),
        ("Update CRM records for Q3", "Completed", "Low", -3),
        ("Schedule demo with NovaTech", "Pending", "High", 4),
        ("Archive closed-lost opportunities", "Completed", "Low", -5),
    ]
    for title, status, priority, due_offset in tasks_data:
        due_date = (today + timedelta(days=due_offset)).isoformat()
        db.add(
            Task(
                title=title, status=status, priority=priority, due_date=due_date, owner_id=owner_id
            )
        )

    activities_data = [
        ("create", "Created a lead — Rahul Sharma, ABC Company", 2),
        ("answer", 'Answered: "What is the price of our CRM product?"', 18),
        ("draft", "Drafted a follow-up email for Priya Nair — awaiting approval", 41),
        ("qualify", "Qualified a lead — marked Fintrack Ltd. as Sales Ready", 65),
        ("update", "Updated a lead — stage moved to Negotiation for Nova Retail", 120),
        ("task", "Created a task — Follow up with Rahul Sharma", 150),
        ("create", "Created a lead — Neha Kapoor, Bright Solutions", 300),
        ("answer", 'Answered: "Do we offer a free trial?"', 380),
        ("draft", "Drafted a follow-up email for Karan Mehta — awaiting approval", 460),
        ("qualify", "Qualified a lead — marked NovaTech as Sales Ready", 600),
        ("update", "Updated a lead — status changed to Lost for Quantum Works", 900),
        ("task", "Created a task — Schedule demo with NovaTech", 1200),
    ]
    for type_, description, minutes_ago in activities_data:
        db.add(
            Activity(
                type=type_,
                description=description,
                created_at=now - timedelta(minutes=minutes_ago),
                owner_id=owner_id,
            )
        )

    approvals_data = [
        (
            "email_draft",
            "Follow-up email — Priya Nair",
            "Hi Priya,\n\nThanks for your interest in AutomateAI. Following up on our "
            "conversation — I'd love to set up a quick call this week to walk through "
            "pricing and see if we're a fit for Fintrack Ltd.\n\nLet me know a time that "
            "works for you.\n\nBest,\nAisha",
            "Priya Nair — Fintrack Ltd.",
            41,
        ),
        (
            "email_draft",
            "Follow-up email — Karan Mehta",
            "Hi Karan,\n\nGreat speaking with you earlier. As discussed, NovaTech looks "
            "like a strong fit for our Smart CRM module. I've attached a tailored "
            "proposal — happy to walk through it live whenever works for you.\n\n"
            "Best,\nAisha",
            "Karan Mehta — NovaTech",
            460,
        ),
        (
            "email_draft",
            "Pricing question response — Vikram Rao",
            "Hi Vikram,\n\nOur CRM starts at ₹4,999/month for up to 10 seats, with "
            "volume pricing available above that. I can put together a custom quote "
            "for Quantum Works if that's helpful.\n\nBest,\nAisha",
            "Vikram Rao — Quantum Works",
            700,
        ),
    ]
    for type_, title, content, related_to, minutes_ago in approvals_data:
        approval = Approval(
            type=type_,
            title=title,
            content=content,
            related_to=related_to,
            status="Pending",
            created_at=now - timedelta(minutes=minutes_ago),
            owner_id=owner_id,
        )
        db.add(approval)
        db.flush()
        recipient_by_name = {
            "Priya Nair": "priya.nair@fintrack.io",
            "Karan Mehta": "karan.mehta@novatech.io",
            "Vikram Rao": "vikram.rao@quantumworks.com",
        }
        recipient = next((email for name, email in recipient_by_name.items() if name in title), "")
        db.add(
            EmailMessage(
                owner_id=owner_id,
                approval_id=approval.id,
                recipient=recipient,
                subject=title.replace("Follow-up email", "Following up"),
                body=content,
                status="Pending Approval",
                created_at=now - timedelta(minutes=minutes_ago),
            )
        )
    ai_logs_data = [
        ("Create a lead for Rahul Sharma from ABC Company", "create_lead", "success", "Lead created successfully for Rahul Sharma at ABC Company.", 12),
        ("Show me all qualified leads", "search_leads", "success", "Found 3 lead(s): Rahul Sharma, Karan Mehta, Divya Pillai.", 35),
        ("Create a high priority task to review proposal", "create_task", "success", "Task created: “Review proposal for Nova Retail”.", 80),
        ("Draft a follow-up email for Priya Nair", "draft_followup_email", "success", "Drafted a follow-up email for Priya Nair — sent for your approval.", 140),
        ("What is the pricing for our CRM enterprise plan?", "answer_from_knowledge_base", "success", "Our CRM plans start at ₹4,999/mo for up to 10 seats, with custom enterprise quotes available.", 260),
    ]
    for prompt, tool, status, summary, minutes_ago in ai_logs_data:
        db.add(
            AICommandLog(
                user_request=prompt,
                tool_name=tool,
                status=status,
                result_summary=summary,
                error_message=None,
                created_at=now - timedelta(minutes=minutes_ago),
                owner_id=owner_id,
            )
        )

    db.commit()
    print(
        f"\u2705 Seeded demo data for {DEMO_USER_EMAIL} "
        f"(password: {DEMO_USER_PASSWORD}) — use these to log in locally."
    )
