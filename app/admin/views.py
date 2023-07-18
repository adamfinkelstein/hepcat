from flask import flash, render_template, redirect, url_for, send_file, current_app
from flask_login import login_required, logout_user
from . import admin
from ..uploads import current_user_is_admin, write_results_csv, write_queries_csv
from ..models import wipe_db_clean

@admin.route('/download_csv/<kind>/<key>')
@login_required
def download_results_csv(kind,key):
    if not current_user_is_admin():
        return redirect(url_for('auth.login'))
    inst = current_app.config['INSTANCE']
    # print('instance and key: ', inst, key)
    if key != inst or kind not in ['results','queries']:
        msg ='Sorry -- something is wrong. Try logging back in.'
        flash(msg)
        return redirect(url_for('auth.login'))
    print(f'getting {kind} csv...')
    if kind == 'results':
        fullpath = write_results_csv()
    else:
        fullpath = write_queries_csv()
    return send_file(fullpath, as_attachment=True)

@admin.route('/wipe_database/<key>')
@login_required
def wipe_database(key):
    if not current_user_is_admin():
        return redirect(url_for('auth.login'))
    inst = current_app.config['INSTANCE']
    if key != inst:
        msg ='Sorry -- the admin key is wrong. Try logging back in.'
        flash(msg)
        return redirect(url_for('auth.login'))
    print('about to wipe database...')
    success = wipe_db_clean()
    if success:
        msg ='The database was wiped clean. You have been logged out.'
        flash(msg)
        logout_user()
        return redirect(url_for('auth.login'))
    msg ='The database wipe failed!'
    flash(msg)
    return redirect(url_for('upload.upload_main'))

@admin.route('/zoom_conflictbot/<key>')
@login_required
def zoom_conflictbot(key):
    if not current_user_is_admin():
        return redirect(url_for('auth.login'))
    inst = current_app.config['INSTANCE']
    if key != inst:
        msg ='Sorry -- the admin key is wrong. Try logging back in.'
        flash(msg)
        return redirect(url_for('auth.login'))
    url = f'/admin/zoom_conflictbot/{inst}'
    client_id = current_app.config['ZOOM_CONFLICTBOT_CLIENT_ID']
    client_secret = current_app.config['ZOOM_CONFLICTBOT_CLIENT_SECRET']
    conflictbot_socket = current_app.config['HEPCAT_CONFLICTBOT_SOCKET']
    return render_template('zoom-conflictbot.html', 
                           conflictbot_socket=conflictbot_socket, 
                           url=url, client_id=client_id, 
                           client_secret=client_secret)
