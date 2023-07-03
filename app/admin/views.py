from flask import flash, abort, redirect, url_for, send_file, current_app
from flask_login import login_required, logout_user
from . import admin
from ..uploads import current_user_is_admin, write_results_csv
from ..models import wipe_db_clean

@admin.route('/download_results_csv/<key>')
@login_required
def download_results_csv(key):
    if not current_user_is_admin():
        return redirect(url_for('auth.login'))
    inst = current_app.config['INSTANCE']
    # print('instance and key: ', inst, key)
    if key != inst:
        msg ='Sorry -- the admin key is wrong. Try logging back in.'
        flash(msg)
        return redirect(url_for('auth.login'))
    fullpath = write_results_csv()
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

