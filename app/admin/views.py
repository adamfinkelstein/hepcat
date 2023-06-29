from flask import flash, redirect, url_for, send_file
from flask_login import login_required, logout_user
from . import admin
from ..uploads import current_user_is_admin, write_results_csv
from ..models import wipe_db_clean

@admin.route('/download_results_csv')
@login_required
def download_results_csv():
    if not current_user_is_admin():
        return redirect(url_for('auth.login'))
    fullpath = write_results_csv()
    return send_file(fullpath, as_attachment=True)

@admin.route('/wipe_database')
@login_required
def wipe_database():
    if not current_user_is_admin():
        return redirect(url_for('auth.login'))
    # possibly replace with: drop_and_rebuild_tables()
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

