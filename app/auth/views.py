from flask import render_template, redirect, request, url_for, flash
from flask_login import login_user, logout_user, login_required
from . import auth
from ..models import User, ensure_admin
from .forms import LoginForm

# AF changed this from main.index to app.index and now...
main_index = "main.send_static_index"

# @auth.before_app_request
# def before_request():
#     if current_user.is_authenticated \
#             and not current_user.confirmed \
#             and request.endpoint \
#             and request.blueprint != 'auth' \
#             and request.endpoint != 'static':
#         print('redirect for auth unconfirmed')
#         return redirect(url_for('auth.unconfirmed'))


@auth.route("/login", methods=["GET", "POST"])
def login():
    ensure_admin()  # Esure that special (chair) admin exists at login
    form = LoginForm()
    if form.validate_on_submit():
        email_lower = form.email.data.lower()  # ensure lower case email
        user = User.query.filter_by(email=email_lower).first()
        if user is not None and user.verify_password(form.password.data):
            # possibly here set new token and last-login time for user, here.
            # then use that token in user_loader (models.py).
            remember_me = True
            login_user(user, remember_me)
            next = request.args.get("next")
            # according to this:
            # https://flask-login.readthedocs.io/en/latest/#login-example
            # we should validate next here. is this sufficient???
            # perhaps always just send to '/' ???
            if next is None or not next.startswith("/"):
                next = url_for(main_index)
            return redirect(next)
        flash("Invalid email or password.")
    return render_template("auth/login.html", form=form)


@auth.route("/logout")
@login_required
def logout():
    logout_user()
    flash("You have been logged out.")
    return redirect(url_for(main_index))
