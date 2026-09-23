from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel


class CamelModel(BaseModel):
    """API responses use camelCase (averageBuyPrice, ...) as in the assignment brief."""

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True, from_attributes=True)
