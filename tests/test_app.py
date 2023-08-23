from tests.hepcat_test_case import HepcatTestCase
from app import db
from app.models import User, Paper, conflicts, Label, LabelType, History


class TestApp(HepcatTestCase):
    def test_database(self):
        assert User.query.count() == 15
        assert Paper.query.count() == 100
        assert db.session.query(conflicts).count() == 280
        clusters = [
            cluster.name
            for cluster in Label.query.filter_by(type_enum=LabelType.Cluster)
        ]
        for cluster in ["a", "b", "c", "d", "e"]:
            assert cluster in clusters
        rooms = [room.name for room in Label.query.filter_by(type_enum=LabelType.Room)]
        for room in ["P", "A", "B", "X", "Y"]:
            assert room in rooms
        for user in User.query:
            assert user.rooms in [None, "AX", "BX", "AY", "BY"]
        for paper in Paper.query:
            assert paper.sort_score != 0.0
        assert History.query.count() == 198
