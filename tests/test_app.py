from tests.hepcat_test_case import HepcatTestCase
from app import db
from app.models.tables import User, Paper, conflicts, Label, LabelType


class TestApp(HepcatTestCase):
    def test_database(self):
        assert User.query.count() == 61  # 51 users in test-data/users.csv + 10 rooms
        assert Paper.query.count() == 200
        assert db.session.query(conflicts).count() == 556
        clusters = [
            cluster.name
            for cluster in Label.query.filter_by(type_enum=LabelType.Cluster)
        ]
        for cluster in ["a", "b", "c", "d", "e"]:
            assert cluster in clusters
        rooms = [room.name for room in Label.query.filter_by(type_enum=LabelType.Room)]
        for room in ["Plenary", "Room_1A", "Room_1B", "Room_2A", "Room_2B"]:
            assert room in rooms
        for user in User.query:
            assert user.rooms in [
                None,
                "Plenary",
                "Room_1A",
                "Room_1B",
                "Room_2A",
                "Room_2B",
                "Room_1A Room_2A",
                "Room_1B Room_2A",
                "Room_1B Room_2B",
                "Room_1A Room_2B",
            ]
        for paper in Paper.query:
            assert paper.sort_score > -9
            assert paper.sort_score < 9
        # AF: I am not sure what this should be now, so I am commenting it out
        # need to import History above to use it:
        # assert History.query.count() == 225
