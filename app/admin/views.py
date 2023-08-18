from flask import flash, render_template, redirect, url_for, send_file, current_app
from flask_login import login_user, logout_user
from . import admin
from ..uploads import write_kind_of_csv
from ..models import wipe_db_clean, User
from .decorators import admin_required_for_route, super_required_for_route


@admin.route('/download_csv/<kind>/<key>')
@admin_required_for_route
def download_results_csv(kind, key):
    inst = current_app.config['INSTANCE']
    # print('instance and key: ', inst, key)
    ok_kinds = ['results', 'queries', 'history']
    if key != inst or kind not in ok_kinds:
        msg = 'Sorry -- something is wrong. Try logging back in.'
        flash(msg)
        return redirect(url_for('auth.login'))
    print(f'getting {kind} csv...')
    fullpath = write_kind_of_csv(kind)
    return send_file(fullpath, as_attachment=True)


@admin.route('/wipe_database/<key>')
@super_required_for_route
def wipe_database(key):
    inst = current_app.config['INSTANCE']
    if key != inst:
        msg = 'Sorry -- the admin key is wrong. Try logging back in.'
        flash(msg)
        return redirect(url_for('auth.login'))
    print('about to wipe database...')
    success = wipe_db_clean()
    if success:
        msg = 'The database was wiped clean. You have been logged out.'
        flash(msg)
        logout_user()
        return redirect(url_for('auth.login'))
    msg = 'The database wipe failed!'
    flash(msg)
    return redirect(url_for('upload.upload_main'))


@admin.route('/zoom_conflictbot/<key>')
@admin_required_for_route
def zoom_conflictbot(key):
    inst = current_app.config['INSTANCE']
    if key != inst:
        msg = 'Sorry -- the admin key is wrong. Try logging back in.'
        flash(msg)
        return redirect(url_for('auth.login'))
    url = f'/admin/zoom_conflictbot/{inst}'
    client_id = current_app.config['ZOOM_CONFLICTBOT_CLIENT_ID']
    client_secret = current_app.config['ZOOM_CONFLICTBOT_CLIENT_SECRET']
    conflictbot_socket = current_app.config['HEPCAT_CONFLICTBOT_SOCKET']
    return render_template(
        'zoom-conflictbot.html',
        conflictbot_socket=conflictbot_socket,
        url=url,
        client_id=client_id,
        client_secret=client_secret,
    )


@admin.route('/switch_user/<email>/<key>')
@admin_required_for_route
def switch_user(email, key):
    inst = current_app.config['INSTANCE']
    if key != inst:
        msg = 'Sorry -- the admin key is wrong. Try logging back in.'
        flash(msg)
        return redirect(url_for('auth.login'))
    email = email.lower()
    user = User.query.filter_by(email=email).first()
    if user:
        remember_me = True
        login_user(user, remember_me)
        msg = f'You are now logged in as {user.full_name}.'
    else:
        msg = f'Unable to find user with email {email}!'
    flash(msg)
    main_index = 'main.send_static_index'
    next = url_for(main_index)
    return redirect(next)
