from pathlib import Path

import cv2
import numpy as np


ROOT = Path(__file__).resolve().parents[1]
PUBLIC_DIR = ROOT / "public"
SOURCE_CANDIDATES = (PUBLIC_DIR / "character.mp4", ROOT / "character.mp4")
FRAME_DIR = PUBLIC_DIR / "frames"
FRAME_COUNT = 64
FRAME_WIDTH = 1440
WEBP_QUALITY = 94
TARGET_FACE_CENTER = (0.484, 0.524)

DIRECTION_FACE_CENTERS = {
    "UP": (0.486, 0.442),
    "UP-RIGHT": (0.585, 0.449),
    "RIGHT": (0.591, 0.496),
    "DOWN-RIGHT": (0.548, 0.548),
    "DOWN": (0.482, 0.553),
    "DOWN-LEFT": (0.363, 0.506),
    "LEFT": (0.366, 0.468),
    "UP-LEFT": (0.367, 0.444),
}
FACE_PATH = (
    (80, *DIRECTION_FACE_CENTERS["RIGHT"]),
    (104, *DIRECTION_FACE_CENTERS["DOWN-RIGHT"]),
    (120, *DIRECTION_FACE_CENTERS["DOWN"]),
    (152, *DIRECTION_FACE_CENTERS["DOWN-LEFT"]),
    (168, *DIRECTION_FACE_CENTERS["LEFT"]),
    (184, *DIRECTION_FACE_CENTERS["UP-LEFT"]),
    (218, 0.478, 0.480),
    (239, 0.484, 0.524),
    (240, 0.483, 0.505),
    (268, *DIRECTION_FACE_CENTERS["UP"]),
    (304, *DIRECTION_FACE_CENTERS["UP-RIGHT"]),
    (320, *DIRECTION_FACE_CENTERS["RIGHT"]),
)
HEAD_POLYGON = (
    (0.47, 0.11),
    (0.57, 0.13),
    (0.66, 0.20),
    (0.72, 0.29),
    (0.75, 0.42),
    (0.74, 0.52),
    (0.70, 0.59),
    (0.65, 0.65),
    (0.57, 0.69),
    (0.55, 0.78),
    (0.52, 0.81),
    (0.43, 0.81),
    (0.40, 0.78),
    (0.40, 0.69),
    (0.33, 0.65),
    (0.28, 0.59),
    (0.25, 0.51),
    (0.25, 0.40),
    (0.28, 0.29),
    (0.35, 0.19),
    (0.42, 0.13),
)

DIRECTION_FRAMES = {
    "UP": 28,
    "UP-RIGHT": 64,
    "RIGHT": 80,
    "DOWN-RIGHT": 104,
    "DOWN": 120,
    "DOWN-LEFT": 152,
    "LEFT": 168,
    "UP-LEFT": 184,
}
CENTER_FRAME = 239


def read_frame(capture, frame_number):
    capture.set(cv2.CAP_PROP_POS_FRAMES, int(frame_number))
    success, frame = capture.read()
    if not success:
        raise RuntimeError(f"Could not decode source frame {frame_number}.")
    return frame


def write_webp(path, frame):
    height, width = frame.shape[:2]
    if width > FRAME_WIDTH:
        resized_height = round(height * FRAME_WIDTH / width)
        frame = cv2.resize(frame, (FRAME_WIDTH, resized_height), interpolation=cv2.INTER_AREA)
    success, encoded = cv2.imencode(
        ".webp", frame, [cv2.IMWRITE_WEBP_QUALITY, WEBP_QUALITY]
    )
    if not success:
        raise RuntimeError(f"Could not encode {path} as WebP.")
    path.write_bytes(encoded.tobytes())


def background_bgr(frame):
    height, width = frame.shape[:2]
    size = max(1, min(width, height) // 12)
    corners = np.concatenate(
        [
            frame[:size, :size].reshape(-1, 3),
            frame[:size, -size:].reshape(-1, 3),
            frame[-size:, :size].reshape(-1, 3),
            frame[-size:, -size:].reshape(-1, 3),
        ]
    )
    return np.median(corners, axis=0).round().astype(np.uint8)


def flatten_background(frame, color_bgr):
    lab = cv2.cvtColor(frame, cv2.COLOR_BGR2LAB).astype(np.int16)
    target = cv2.cvtColor(np.uint8([[color_bgr]]), cv2.COLOR_BGR2LAB)[0, 0].astype(np.int16)
    distance = np.linalg.norm(lab - target, axis=2)
    candidates = (distance < 18).astype(np.uint8)
    _, labels = cv2.connectedComponents(candidates, connectivity=8)
    edge_labels = np.unique(
        np.concatenate((labels[0], labels[-1], labels[:, 0], labels[:, -1]))
    )
    frame[np.isin(labels, edge_labels)] = color_bgr
    return frame


def face_center(source_frame):
    positions = np.asarray([point[0] for point in FACE_PATH], dtype=np.float32)
    centers = np.asarray([point[1:] for point in FACE_PATH], dtype=np.float32)
    return tuple(np.interp(source_frame, positions, centers[:, axis]) for axis in range(2))


def make_head_mask(width, height):
    points = np.asarray(
        [[round(x * width), round(y * height)] for x, y in HEAD_POLYGON], dtype=np.int32
    )
    mask = np.zeros((height, width), dtype=np.uint8)
    cv2.fillPoly(mask, [points], 255)
    return cv2.GaussianBlur(mask, (0, 0), 2.0).astype(np.float32) / 255.0


def composite_head(base, source, source_face, head_mask, color_bgr):
    height, width = base.shape[:2]
    shift_x = round((TARGET_FACE_CENTER[0] - source_face[0]) * width)
    shift_y = round((TARGET_FACE_CENTER[1] - source_face[1]) * height)
    aligned = cv2.warpAffine(
        source,
        np.float32([[1, 0, shift_x], [0, 1, shift_y]]),
        (width, height),
        borderMode=cv2.BORDER_CONSTANT,
        borderValue=tuple(int(value) for value in color_bgr),
    )

    source_color = background_bgr(aligned)
    aligned_lab = cv2.cvtColor(aligned, cv2.COLOR_BGR2LAB).astype(np.int16)
    source_lab = cv2.cvtColor(np.uint8([[source_color]]), cv2.COLOR_BGR2LAB)[0, 0].astype(np.int16)
    distance = np.linalg.norm(aligned_lab - source_lab, axis=2)
    foreground = np.clip((distance - 11) / 15, 0, 1).astype(np.float32)
    alpha = foreground * head_mask

    result = base.copy()
    polygon = head_mask > 0.01
    result[polygon] = color_bgr
    alpha_3d = alpha[:, :, None]
    result = np.clip(result.astype(np.float32) * (1 - alpha_3d) + aligned.astype(np.float32) * alpha_3d, 0, 255)
    return result.astype(np.uint8)


def main():
    source = next((path for path in SOURCE_CANDIDATES if path.is_file()), None)
    if source is None:
        raise FileNotFoundError("Place character.mp4 in the project root or public/.")

    capture = cv2.VideoCapture(str(source))
    if not capture.isOpened():
        raise RuntimeError(f"Could not open {source}.")

    count = int(capture.get(cv2.CAP_PROP_FRAME_COUNT))
    fps = capture.get(cv2.CAP_PROP_FPS)
    width = int(capture.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(capture.get(cv2.CAP_PROP_FRAME_HEIGHT))
    if count <= CENTER_FRAME or fps <= 0:
        raise ValueError(f"Expected at least {CENTER_FRAME + 1} frames; found {count}.")

    color_samples = [background_bgr(read_frame(capture, frame_number)) for frame_number in DIRECTION_FRAMES.values()]
    color_samples.append(background_bgr(read_frame(capture, CENTER_FRAME)))
    color_bgr = np.median(np.asarray(color_samples), axis=0).round().astype(np.uint8)
    background_hex = "#{:02X}{:02X}{:02X}".format(*color_bgr[::-1])

    print(f"Source: {source}")
    print(f"Timeline: {count} frames, {fps:.3f} fps, {width}x{height}, {count / fps:.3f}s")
    print(f"Corner-median background: {background_hex}")
    print("Directional anchors (frame, timestamp):")
    for direction, frame_number in DIRECTION_FRAMES.items():
        print(f"  {direction:10} {frame_number:3}  {frame_number / fps:.3f}s")
    print(f"  {'CENTER':10} {CENTER_FRAME:3}  {CENTER_FRAME / fps:.3f}s")

    ordered_anchors = [
        DIRECTION_FRAMES[direction]
        for direction in (
            "RIGHT",
            "DOWN-RIGHT",
            "DOWN",
            "DOWN-LEFT",
            "LEFT",
            "UP-LEFT",
            "UP",
            "UP-RIGHT",
        )
    ]
    extended_anchors = ordered_anchors + [ordered_anchors[0] + count]
    FRAME_DIR.mkdir(parents=True, exist_ok=True)
    center = flatten_background(read_frame(capture, CENTER_FRAME), color_bgr)
    head_mask = make_head_mask(width, height)

    for frame_index in range(FRAME_COUNT):
        segment = frame_index // 8
        fraction = (frame_index % 8) / 8
        start = extended_anchors[segment]
        end = extended_anchors[segment + 1]
        source_unwrapped = round(start + (end - start) * fraction)
        source_frame = source_unwrapped % count
        source = read_frame(capture, source_frame)
        source = composite_head(center, source, face_center(source_unwrapped), head_mask, color_bgr)
        write_webp(FRAME_DIR / f"frame-{frame_index:02d}.webp", source)

    write_webp(FRAME_DIR / "center.webp", center)
    capture.release()
    print(f"Wrote {FRAME_COUNT} rotation frames and center.webp to {FRAME_DIR}")


if __name__ == "__main__":
    main()