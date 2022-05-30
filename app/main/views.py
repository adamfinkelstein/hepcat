from flask import render_template, flash, current_app
from . import main
from werkzeug import secure_filename
from .forms import UploadForm
import os


@main.route('/')
def index():
    return render_template('index.html')

# AF: this function and the following route are for debugging internal variables
def debugConfigToString(config):
    output = '\n'
    for key in config:
        val = config[key]
        if type(val) == str:
            output += f'{key} : {val}\n'
    return output

@main.route('/debug/')
def debug():
    debug_title = False
    debug_output = 'Nothing to see here.'
    app = current_app._get_current_object()
    if app and app.config:
        debug_title = "app.config"
        debug_output = debugConfigToString(app.config)
    return render_template('debug.html', 
        debug_title=debug_title, debug_output=debug_output)

# following https://flask.palletsprojects.com/en/2.1.x/patterns/fileuploads/
def isCSV(filename):
    if '.' not in filename:
        return False
    ext = filename.rsplit('.', 1)[1].lower()
    return ext == 'csv'

def makePathIfNeeded(path):
    if not os.path.exists(path):
        os.makedirs(path)

@main.route('/upload/', methods=('GET', 'POST'))
def upload():
    form = UploadForm()
    filename = None
    if form.validate_on_submit():
        file = form.file.data
        filename = secure_filename(file.filename)
        if not isCSV(filename):
            filename = None
            flash('Uploaded file is not CSV, ignored.')
        else:
            app = current_app._get_current_object()
            folder = app.config['UPLOAD_FOLDER']
            makePathIfNeeded(folder)
            fullpath = os.path.join(folder, filename)
            file.save(fullpath)
            flash('saved csv file here: '+fullpath)
    return render_template('upload.html', form=form, filename=filename)


''' Should follow redirect like this:
@auth.route('/register', methods=['GET', 'POST'])
def register():
    form = RegistrationForm()
    if form.validate_on_submit():
        user = User(email=form.email.data.lower(),
                    username=form.username.data,
                    password=form.password.data)
        db.session.add(user)
        db.session.commit()
        token = user.generate_confirmation_token()
        send_email(user.email, 'Confirm Your Account',
                   'auth/email/confirm', user=user, token=token)
        flash('A confirmation email has been sent to you by email.')
        return redirect(url_for('auth.login'))
    return render_template('auth/register.html', form=form)
'''