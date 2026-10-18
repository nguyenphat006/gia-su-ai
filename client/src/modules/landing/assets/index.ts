/**
 * Ảnh và icon của trang chủ công khai (import tĩnh -> next/image tự lấy kích thước + ảnh mờ giữ chỗ).
 *
 * Nguồn (dùng miễn phí, không bắt buộc ghi công — vẫn ghi ở footer):
 * - Ảnh: Unsplash License (https://unsplash.com/license)
 *   - tutor-study.jpg          Julio Lopez — unsplash.com/photos/Imz-pn2LMbg
 *   - practice-microscope.jpg  Anna Khromova — unsplash.com/photos/DQ1QLSf_bP0
 *   - arena-raised-hands.jpg   Vitaly Gariev — unsplash.com/photos/HIheRKI9mTs
 *   - teacher-lab.jpg          Vitaly Gariev — unsplash.com/photos/UStQpco0TWo
 * - Icon 3D: Microsoft Fluent Emoji, giấy phép MIT (github.com/microsoft/fluentui-emoji)
 */
import arenaRaisedHands from "./photos/arena-raised-hands.jpg";
import practiceMicroscope from "./photos/practice-microscope.jpg";
import teacherLab from "./photos/teacher-lab.jpg";
import tutorStudy from "./photos/tutor-study.jpg";

import atomSymbol from "./icons/atom-symbol.png";
import barChart from "./icons/bar-chart.png";
import books from "./icons/books.png";
import crossedSwords from "./icons/crossed-swords.png";
import dna from "./icons/dna.png";
import graduationCap from "./icons/graduation-cap.png";
import key from "./icons/key.png";
import laptop from "./icons/laptop.png";
import lightBulb from "./icons/light-bulb.png";
import microscope from "./icons/microscope.png";
import openFileFolder from "./icons/open-file-folder.png";
import robot from "./icons/robot.png";
import rocket from "./icons/rocket.png";
import school from "./icons/school.png";
import testTube from "./icons/test-tube.png";
import trophy from "./icons/trophy.png";

export const PHOTOS = { arenaRaisedHands, practiceMicroscope, teacherLab, tutorStudy };

export const ICONS3D = {
  atomSymbol,
  barChart,
  books,
  crossedSwords,
  dna,
  graduationCap,
  key,
  laptop,
  lightBulb,
  microscope,
  openFileFolder,
  robot,
  rocket,
  school,
  testTube,
  trophy,
};

export type Icon3DName = keyof typeof ICONS3D;
