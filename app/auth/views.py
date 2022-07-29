from flask import render_template, redirect, request, url_for, flash
from flask_login import login_user, logout_user, login_required, \
    current_user
from . import auth
from .. import db
from ..models import User
from ..email import send_email
from .forms import LoginForm, RegistrationForm

# AF changed this from main.index to app.index and now...
main_index = 'main.send_static_index' 

@auth.before_app_request
def before_request():
    if current_user.is_authenticated \
            and not current_user.confirmed \
            and request.endpoint \
            and request.blueprint != 'auth' \
            and request.endpoint != 'static':
        print('redirect for auth unconfirmed')
        return redirect(url_for('auth.unconfirmed'))


@auth.route('/unconfirmed')
def unconfirmed():
    if current_user.is_anonymous or current_user.confirmed:
        return redirect(url_for(main_index))
    print('render auth unconfirmed')
    return render_template('auth/unconfirmed.html')


@auth.route('/login', methods=['GET', 'POST'])
def login():
    form = LoginForm()
    if form.validate_on_submit():
        user = User.query.filter_by(email=form.email.data.lower()).first()
        if user is not None and user.verify_password(form.password.data):
            # possibly here set new token and last-login time for user, here.
            # then use that token in user_loader (models.py).
            remember_me = True
            login_user(user, remember_me)
            next = request.args.get('next')
            # according to this:
            # https://flask-login.readthedocs.io/en/latest/#login-example
            # we should validate next here. is this sufficient???
            # perhaps always just send to '/' ???
            if next is None or not next.startswith('/'):
                next = url_for(main_index)
            return redirect(next)
        flash('Invalid email or password.')
    return render_template('auth/login.html', form=form)


@auth.route('/logout')
@login_required
def logout():
    logout_user()
    flash('You have been logged out.')
    return redirect(url_for(main_index))

