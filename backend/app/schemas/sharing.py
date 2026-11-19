from pydantic import BaseModel, ConfigDict


class SharingUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    is_shared: bool