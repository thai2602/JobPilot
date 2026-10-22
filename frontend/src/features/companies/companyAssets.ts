import image1 from "../../assets/company_logo/image_1.png";
import image2 from "../../assets/company_logo/image_2.png";
import image3 from "../../assets/company_logo/image_3.png";
import image4 from "../../assets/company_logo/image_4.png";
import image5 from "../../assets/company_logo/image_5.png";
import image6 from "../../assets/company_logo/image_6.png";
import image7 from "../../assets/company_logo/image_7.png";
import image8 from "../../assets/company_logo/image_8.png";
import image9 from "../../assets/company_logo/image_9.png";
import image10 from "../../assets/company_logo/image_10.png";
import image11 from "../../assets/company_logo/image_11.png";
import image12 from "../../assets/company_logo/image_12.png";
import image13 from "../../assets/company_logo/image_13.png";
import image14 from "../../assets/company_logo/image_14.png";
import image15 from "../../assets/company_logo/image_15.png";
import image16 from "../../assets/company_logo/image_16.png";
import image17 from "../../assets/company_logo/image_17.png";
import image18 from "../../assets/company_logo/image_18.png";
import image19 from "../../assets/company_logo/image_19.png";
import image20 from "../../assets/company_logo/image_20.png";
import image21 from "../../assets/company_logo/image_21.png";
import image22 from "../../assets/company_logo/image_22.png";
import image23 from "../../assets/company_logo/image_23.png";
import image24 from "../../assets/company_logo/image_24.png";
import image25 from "../../assets/company_logo/image_25.png";
import image26 from "../../assets/company_logo/image_26.png";
import image27 from "../../assets/company_logo/image_27.png";
import image28 from "../../assets/company_logo/image_28.png";
import image29 from "../../assets/company_logo/image_29.png";
import image30 from "../../assets/company_logo/image_30.png";

import companyImage1 from "../../assets/company_image/image_01.png";
import companyImage2 from "../../assets/company_image/image_02.png";
import companyImage3 from "../../assets/company_image/image_03.png";
import companyImage4 from "../../assets/company_image/image_04.png";
import companyImage5 from "../../assets/company_image/image_05.png";
import companyImage6 from "../../assets/company_image/image_06.png";
import companyImage7 from "../../assets/company_image/image_07.png";
import companyImage8 from "../../assets/company_image/image_08.png";
import companyImage9 from "../../assets/company_image/image_09.png";
import companyImage10 from "../../assets/company_image/image_10.png";
import companyImage11 from "../../assets/company_image/image_11.png";
import companyImage12 from "../../assets/company_image/image_12.png";
import companyImage13 from "../../assets/company_image/image_13.png";
import companyImage14 from "../../assets/company_image/image_14.png";
import companyImage15 from "../../assets/company_image/image_15.png";
import companyImage16 from "../../assets/company_image/image_16.png";
import companyImage17 from "../../assets/company_image/image_17.png";
import companyImage18 from "../../assets/company_image/image_18.png";
import companyImage19 from "../../assets/company_image/image_19.png";
import companyImage20 from "../../assets/company_image/image_20.png";

export const companyAvatars = [
   image1,
   image2,
   image3,
   image4,
   image5,
   image6,
   image7,
   image8,
   image9,
   image10,
   image11,
   image12,
   image13,
   image14,
   image15,
   image16,
   image17,
   image18,
   image19,
   image20,
   image21,
   image22,
   image23,
   image24,
   image25,
   image26,
   image27,
   image28,
   image29,
   image30,
];

export const companyImages = [
   companyImage1,
   companyImage2,
   companyImage3,
   companyImage4,
   companyImage5,
   companyImage6,
   companyImage7,
   companyImage8,
   companyImage9,
   companyImage10,
   companyImage11,
   companyImage12,
   companyImage13,
   companyImage14,
   companyImage15,
   companyImage16,
   companyImage17,
   companyImage18,
   companyImage19,
   companyImage20,
];

type ImageSource = string | { src: string };

/** Đường dẫn ảnh dùng được cho thẻ <img>, kể cả khi là ảnh import tĩnh của Next. */
export const imageSrc = (image?: ImageSource | null): string =>
   !image ? "" : typeof image === "string" ? image : image.src;

const nameHash = (name: string): number =>
   Array.from(name).reduce((total, char) => total + char.charCodeAt(0), 0);

/** Logo minh hoạ cố định theo tên công ty, dùng khi API không có logo. */
export const fallbackCompanyLogo = (name: string): string =>
   imageSrc(companyAvatars[nameHash(name) % companyAvatars.length]);

/** Ảnh môi trường làm việc minh hoạ cố định theo tên công ty. */
export const fallbackCompanyImage = (name: string): string =>
   imageSrc(companyImages[nameHash(name) % companyImages.length]);
