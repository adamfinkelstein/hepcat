from .. import ma

######################
# Marshmallo schemas
######################


class UserSchema(ma.Schema):
    class Meta:
        fields = (
            "email",
            "full_name",
            "role_name",
            "role_is_admin",
            "rooms",
            "room_name",
        )


class PaperSchema(ma.Schema):
    class Meta:
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
            "summary",
            "exception",
        )


class HistorySchema(ma.Schema):
    class Meta:
        fields = ("when", "context", "status")


class FileUploadSchema(ma.Schema):
    class Meta:
        fields = ("file", "count", "when")


class GlobQueueSchema(ma.Schema):
    class Meta:
        fields = (
            "room",
            "bar",
            "hide_queue",
            "message",
            "current",
            "current_show",
            "current_start",
            "current_show_enter",
            "called_users",
        )


# Currently unused. Could possibly be made useful by
# adding a virtual field (function) to the model that
# returns json.loads(filter.text) if is_gui.
#
# class FilterSchema(ma.Schema):
#     class Meta:
#         fields = ("name", "is_gui", "text")
