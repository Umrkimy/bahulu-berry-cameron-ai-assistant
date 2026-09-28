from main import is_image_upload_request


def test_media_library_upload_uses_the_bounded_image_request_limit():
    content_type = "multipart/form-data; boundary=fake"
    assert is_image_upload_request("POST", "/api/media", content_type)
    assert is_image_upload_request("POST", "/api/products/7/images", content_type)
    assert is_image_upload_request("PUT", "/api/products/7/images/4", content_type)
    assert not is_image_upload_request("PATCH", "/api/media/4", "application/json")
    assert not is_image_upload_request("POST", "/api/media/4/archive", content_type)
