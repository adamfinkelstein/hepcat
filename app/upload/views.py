from flask import render_template, flash, redirect, url_for, send_file
from flask_login import login_required, logout_user
from werkzeug.utils import secure_filename
from . import upload
from .forms import UploadForm
from ..uploads import current_user_is_admin, current_user_is_super, is_csv, save_and_read_csv, pending_uploads, write_results_csv
from ..models import FileUpload, wipe_db_clean

# following https://flask.palletsprojects.com/en/2.1.x/patterns/fileuploads/
@upload.route('/', methods=('GET', 'POST'))
@login_required
def upload_main():
    if not current_user_is_admin():
        return redirect(url_for('auth.login'))
    form = UploadForm()
    filename = None
    logout = False
    if form.validate_on_submit():
        file = form.file.data
        filename = secure_filename(file.filename)
        if not is_csv(filename):
            filename = None
            flash('Uploaded file is not CSV, ignored.')
        else:
            msg, logout = save_and_read_csv(file, filename)
            if msg != "already_sent_flash_msg":
                if msg:
                    msg = f'Uploaded file "{filename}". ' + msg
                else:
                    msg = f'Unable to read csv file "{filename}". Perhaps the header is wrong?'
                flash(msg)
    if logout:
        logout_user()
        return redirect(url_for('auth.login'))
    uploads = FileUpload.query.all()
    pending = pending_uploads(uploads)
    super = current_user_is_super()
    return render_template('upload.html', form=form, filename=filename, uploads=uploads, pending=pending, linklings=csvLinklings, superuser=super)

@upload.route('/download_results_csv')
@login_required
def download_results_csv():
    if not current_user_is_admin():
        return redirect(url_for('auth.login'))
    fullpath = write_results_csv()
    return send_file(fullpath, as_attachment=True)

@upload.route('/wipe_database')
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

