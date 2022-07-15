from flask_wtf import FlaskForm
from wtforms import SubmitField, FileField
# from wtforms.validators import DataRequired

class UploadForm(FlaskForm):
    file = FileField('Your CSV File')
    submit = SubmitField('Upload CSV')

