from marshmallow_sqlalchemy import SQLAlchemyAutoSchema
from marshmallow import fields
from .. import db
from .tables import User, Paper, History, FileUpload, GlobQueue

######################
#
# Marshmallow schemas
#
######################


class UserSchema(SQLAlchemyAutoSchema):
    role_name = fields.Method("get_role_name", dump_only=True)
    role_is_admin = fields.Method("get_role_is_admin", dump_only=True)

    class Meta:
        model = User
        load_instance = True
        sqla_session = db.session
        fields = (
            "email",
            "full_name",
            "role_name",
            "role_is_admin",
            "rooms",
            "room_name",
        )

    def get_role_name(self, obj):
        return obj.role_name

    def get_role_is_admin(self, obj):
        return obj.role_is_admin


class PaperSchema(SQLAlchemyAutoSchema):
    class Meta:
        model = Paper
        load_instance = True
        sqla_session = db.session
        fields = (
            "nid",
            "sid",
            "oid",
            "sort_score",
            "all_scores",
            "queue_order",
            "journal_only",
            "thumbnail",
            "title",
            "abstract",
            "exception",
        )


class HistorySchema(SQLAlchemyAutoSchema):
    context = fields.Method("get_context", dump_only=True)
    status = fields.Method("get_status", dump_only=True)

    class Meta:
        model = History
        load_instance = True
        sqla_session = db.session
        fields = ("when", "context", "status")

    def get_context(self, obj):
        return obj.context

    def get_status(self, obj):
        return obj.status


class FileUploadSchema(SQLAlchemyAutoSchema):
    class Meta:
        model = FileUpload
        load_instance = True
        sqla_session = db.session
        fields = ("file", "count", "when")


class GlobQueueSchema(SQLAlchemyAutoSchema):
    class Meta:
        model = GlobQueue
        load_instance = True
        sqla_session = db.session
        fields = (
            "room",
            "hide_queue",
            "message",
            "current",
            "current_show",
            "current_start",
            "current_show_enter",
        )


######################
#
# Exported schemas
#
######################


user_schema = UserSchema()
paper_schema = PaperSchema()
global_schema = GlobQueueSchema()
history_schema = HistorySchema(many=True)
uploads_schema = FileUploadSchema(many=True)
