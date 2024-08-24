import os
from smtplib import SMTPException
from flask import send_from_directory, request, render_template, url_for
from flask_mail import Message
from . import main
from .. import static_folder, log_print, mail
from ..models.tables import User


@main.route("/login/")
@main.route("/forgot_password/")
@main.route("/about/")
@main.route("/preferences/")
@main.route("/uploads/")
@main.route("/progress/")
@main.route("/users/")
@main.route("/change_password/")
@main.route("/")
def send_static_index():
    log_print(f"send index from static folder: {static_folder}")
    return send_from_directory(static_folder, "index.html")


@main.route("/api/reset_password", methods=["POST"])
def reset_password():
    email = request.get_json().get("email")
    log_print(f"password reset request for email {email}")
    if not email:
        return {"error": "email was not provided"}, 400

    user = User.query.filter_by(email=email).first()
    if not user:
        return {"error": "email not found"}, 400

    url = os.path.join(
        url_for("main.send_static_index", _external=True), "change_password"
    )  # the change password page in the React app
    token = user.generate_token(600)  # 10 minute expiration
    text_email = render_template(
        "email_reset_password.txt", user=user, token=token, url=url
    )
    html_email = render_template(
        "email_reset_password.html", user=user, token=token, url=url
    )
    msg = Message(
        subject="[Hepcat] Reset Your Password",
        recipients=[email],
        body=text_email,
        html=html_email,
    )
    try:
        log_print(f"sending email to {email}")
        mail.send(msg)
    except SMTPException as e:
        log_print(f"failed attempt to send email to {email}, error:")
        log_print(e)
        return {"error": "error sending email"}, 400
    return {}
