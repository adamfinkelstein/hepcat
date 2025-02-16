from enum import IntEnum

######################
#
# Labels
#
######################


class LabelType(IntEnum):
    Area = 0
    Cluster = 1
    Room = 2
    Bar = 3  # not actually used, except to sort labels for GUI
    Exception = 4
    Tag = 5


def label_str_to_enum(str):
    if hasattr(LabelType, str):
        return int(LabelType[str])
    return 0  # default is Area


# This appears not to be used:
# def label_enum_to_str(n):
#     for entry in LabelType:
#         # log_print(entry.name, entry.value)
#         if entry.value == n:
#             return entry.name
#     return "Area"  # default
