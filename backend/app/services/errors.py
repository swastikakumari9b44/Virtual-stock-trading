class ServiceError(Exception):
    """A business-rule failure that maps directly to an HTTP error."""

    def __init__(self, status_code: int, message: str):
        super().__init__(message)
        self.status_code = status_code
        self.message = message
