import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { io } from "socket.io-client";
import { api, getApiUrl } from "./lib/apiClient.js";
import { decodeJwtPayload } from "./lib/tokenUtils.js";
import TokenStatus from "./components/TokenStatus.jsx";
import AppShell from "./components/AppShell.jsx";
import ErrorBoundary from "./components/ErrorBoundary.jsx";
import FunctionEditor from "./components/FunctionEditor.jsx";
import SoundSelector from "./components/SoundSelector.jsx";
import toast from "react-hot-toast";

const API_URL = getApiUrl();

export default function MinecraftDashboard({ onLogout }) {
  const [authorized, setAuthorized] = useState(false);
  const [username, setUsername] = useState("");
  const [presets, setPresets] = useState([]);
  const [overlay, setOverlay] = useState({});
  const [stats, setStats] = useState({ coins: 0, viewers: 0, winGoal: 100, timer: 0 });
  const [newPreset, setNewPreset] = useState({ giftName: "", coinsPerUnit: 1, commands: [""], soundFile: "default.mp3", imageUrl: "", enabled: true });
  const [editingPreset, setEditingPreset] = useState(null);
  const [overlayUrls, setOverlayUrls] = useState({ goalLikes: "", smartBar: "", topGifters: "", giftPresets: "" });
  const [tiktokAccounts, setTiktokAccounts] = useState([]);
  const [newTiktokAccount, setNewTiktokAccount] = useState({ username: "", description: "" });
  const [selectedTiktokAccount, setSelectedTiktokAccount] = useState(null);
  const [showFunctionEditor, setShowFunctionEditor] = useState(false);
  const [showSoundSelector, setShowSoundSelector] = useState(false);
  const [currentFunction, setCurrentFunction] = useState(null);
  const [functions, setFunctions] = useState([]);
  const [showGiftSelector, setShowGiftSelector] = useState(false);
  const [selectedGift, setSelectedGift] = useState(null);
  const [selectedSound, setSelectedSound] = useState(null);
  const [uploadedSound, setUploadedSound] = useState(null);
  const [pluginKey, setPluginKey] = useState("");
  const socketRef = useRef(null);
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  // TikTok Gifts có sẵn
  const availableGifts = [
    { name: "Rose", price: 1, imageUrl: "https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/eba3a9bb85c33e017f3648eaf88d7189~tplv-obj.webp" },
    { name: "You're awesome", price: 1, imageUrl: "https://p16-webcast.tiktokcdn.com/img/alisg/webcast-sg/resource/e9cafce8279220ed26016a71076d6a8a.png~tplv-obj.webp" },
    { name: "GG", price: 1, imageUrl: "https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/3f02fa9594bd1495ff4e8aa5ae265eef~tplv-obj.webp" },
    { name: "TikTok", price: 1, imageUrl: "https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/802a21ae29f9fae5abe3693de9f874bd~tplv-obj.webp" },
    { name: "Love you so much", price: 1, imageUrl: "https://p16-webcast.tiktokcdn.com/img/alisg/webcast-sg/resource/fc549cf1bc61f9c8a1c97ebab68dced7.png~tplv-obj.webp" },
    { name: "Ice Cream Cone", price: 1, imageUrl: "https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/968820bc85e274713c795a6aef3f7c67~tplv-obj.webp" },
    { name: "Heart Me", price: 1, imageUrl: "https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/d56945782445b0b8c8658ed44f894c7b~tplv-obj.webp" },
    { name: "Thumbs Up", price: 1, imageUrl: "https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/570a663e27bdc460e05556fd1596771a~tplv-obj.webp" },
    { name: "Heart", price: 1, imageUrl: "https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/dd300fd35a757d751301fba862a258f1~tplv-obj.webp" },
    { name: "Glow Stick", price: 1, imageUrl: "https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/8e1a5d66370c5586545e358e37c10d25~tplv-obj.webp" },
    { name: "Love you", price: 1, imageUrl: "https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/ab0a7b44bfc140923bb74164f6f880ab~tplv-obj.webp" },
    { name: "Birthday Cake", price: 1, imageUrl: "https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/3ac5ec732f6f4ba7b1492248bfea83d6~tplv-obj.webp" },
    { name: "Pumpkin", price: 1, imageUrl: "https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/resource/c9734b74f0e4e79bdfa2ef07c393d8ee.png~tplv-obj.webp" },
    { name: "Music  Album", price: 1, imageUrl: "https://p16-webcast.tiktokcdn.com/img/alisg/webcast-sg/resource/2a5378fbb272f5b4be0678084c66bdc1.png~tplv-obj.webp" },
    { name: "Wink Charm", price: 1, imageUrl: "https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/resource/295d753e095c6ac8b180691f20d64ea8.png~tplv-obj.webp" },
    { name: "Go Popular", price: 1, imageUrl: "https://p16-webcast.tiktokcdn.com/img/alisg/webcast-sg/resource/b342e28d73dac6547e0b3e2ad57f6597.png~tplv-obj.webp" },
    { name: "Club Cheers", price: 1, imageUrl: "https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/resource/6a934c90e5533a4145bed7eae66d71bd.png~tplv-obj.webp" },
    { name: "Team Bracelet", price: 2, imageUrl: "https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/resource/54cb1eeca369e5bea1b97707ca05d189.png~tplv-obj.webp" },
    { name: "Finger Heart", price: 5, imageUrl: "https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/a4c4dc437fd3a6632aba149769491f49.png~tplv-obj.webp" },
    { name: "Phoenix Flower", price: 5, imageUrl: "https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/90a405cf917cce27a8261739ecd84b89.png~tplv-obj.webp" },
    { name: "Potato", price: 5, imageUrl: "https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/resource/909e256029f1649a9e7e339ef71c6896.png~tplv-obj.webp" },
    { name: "Ice cream", price: 5, imageUrl: "https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/a40b91f7a11d4cbce780989e2d20a1f4~tplv-obj.webp" },
    { name: "Okay", price: 5, imageUrl: "https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/resource/0573114db41d2cf9c7dd70c8b0fab38e.png~tplv-obj.webp" },
    { name: "Peach", price: 5, imageUrl: "https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/resource/ff861a220649506452e3dc35c58266ea.png~tplv-obj.webp" },
    { name: "Super Popular", price: 9, imageUrl: "https://p16-webcast.tiktokcdn.com/img/alisg/webcast-sg/resource/2fa794a99919386b85402d9a0a991b2b.png~tplv-obj.webp" },
    { name: "Cheer You Up", price: 9, imageUrl: "https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/97e0529ab9e5cbb60d95fc9ff1133ea6~tplv-obj.webp" },
    { name: "Club Power", price: 9, imageUrl: "https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/resource/fb8da877eabca4ae295483f7cdfe7d31.png~tplv-obj.webp" },
    { name: "Rosa", price: 10, imageUrl: "https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/eb77ead5c3abb6da6034d3cf6cfeb438~tplv-obj.webp" },
    { name: "Friendship Necklace", price: 10, imageUrl: "https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/resource/e033c3f28632e233bebac1668ff66a2f.png~tplv-obj.webp" },
    { name: "Journey Pass", price: 10, imageUrl: "https://p16-webcast.tiktokcdn.com/img/alisg/webcast-sg/resource/551ecaf639c5e02354f9e7c1a763ec72.png~tplv-obj.webp" },
    { name: "Good Night", price: 10, imageUrl: "https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/resource/a03bf81f5759ed3ffb048e1ca71b2b5e.png~tplv-obj.webp" },
    { name: "Dumplings", price: 10, imageUrl: "https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/resource/01d07ef5d45eeedce64482be2ee10a74.png~tplv-obj.webp" },
    { name: "Tiny Diny", price: 10, imageUrl: "https://p16-webcast.tiktokcdn.com/img/alisg/webcast-sg/resource/d4a3dbfc29ec50176a9b4bafad10abbd.png~tplv-obj.webp" },
    { name: "Boo", price: 10, imageUrl: "https://p16-webcast.tiktokcdn.com/img/alisg/webcast-sg/resource/d72381e125ad0c1ed70f6ef2aff6c8bc.png~tplv-obj.webp" },
    { name: "Pho", price: 10, imageUrl: "https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/e45927083072ffe0015253d11e11a3b3~tplv-obj.webp" },
    { name: "Lucky Pig", price: 10, imageUrl: "https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/resource/d53125bd5416e6f2f6ab61da02ddd302.png~tplv-obj.webp" },
    { name: "Shamrock", price: 10, imageUrl: "https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/resource/312f721603de550519983ca22f5cc445.png~tplv-obj.webp" },
    { name: "Drip Brewing", price: 10, imageUrl: "https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/resource/3c5e5fc699ed9bee71e79cc90bc5ab37.png~tplv-obj.webp" },
    { name: "Heart Gaze", price: 10, imageUrl: "https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/resource/0fe120fdb52724dd157e41cc5c00a924.png~tplv-obj.webp" },
    { name: "Day Pack", price: 15, imageUrl: "https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/resource/e69a0f223658fc5bddd4b12d90bbd1b8.png~tplv-obj.webp" },
    { name: "Tiny Diny in Love", price: 15, imageUrl: "https://p16-webcast.tiktokcdn.com/img/alisg/webcast-sg/resource/8dfcceb32feb70403281f02aa808fe0b.png~tplv-obj.webp" },
    { name: "Perfume", price: 20, imageUrl: "https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/20b8f61246c7b6032777bb81bf4ee055~tplv-obj.webp" },
    { name: "Tiny Diny Hotdog", price: 20, imageUrl: "https://p16-webcast.tiktokcdn.com/img/alisg/webcast-sg/resource/a03e11b24f157a26c49cac518450573f.png~tplv-obj.webp" },
    { name: "little kisses", price: 20, imageUrl: "https://p16-webcast.tiktokcdn.com/img/alisg/webcast-sg/resource/0a5db92508ee667339289b2f87bc3123.png~tplv-obj.webp" },
    { name: "Doughnut", price: 30, imageUrl: "https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/4e7ad6bdf0a1d860c538f38026d4e812~tplv-obj.webp" },
    { name: "Takoyaki", price: 88, imageUrl: "https://p16-webcast.tiktokcdn.com/img/alisg/webcast-sg/resource/b0d9f32b9d4c04afbb0267dcb5b576fa.png~tplv-obj.webp" },
    { name: "Paper Crane", price: 99, imageUrl: "https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/0f158a08f7886189cdabf496e8a07c21~tplv-obj.webp" },
    { name: "Little Crown", price: 99, imageUrl: "https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/cf3db11b94a975417043b53401d0afe1~tplv-obj.webp" },
    { name: "Cap", price: 99, imageUrl: "https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/6c2ab2da19249ea570a2ece5e3377f04~tplv-obj.webp" },
    { name: "Hat and Mustache", price: 99, imageUrl: "https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/2f1e4f3f5c728ffbfa35705b480fdc92~tplv-obj.webp" },
    { name: "Like-Pop", price: 99, imageUrl: "https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/75eb7b4aca24eaa6e566b566c7d21e2f~tplv-obj.webp" },
    { name: "Love Painting", price: 99, imageUrl: "https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/resource/de6f01cb2a0deb2da24cb5d1ecf9a23b.png~tplv-obj.webp" },
    { name: "Bubble Gum", price: 99, imageUrl: "https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/resource/52ebbe9f3f53b5567ad11ad6f8303c58.png~tplv-obj.webp" },
    { name: "Little Wing", price: 99, imageUrl: "https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/resource/765b65aa6da04fac1f1e7939863c33e0.png~tplv-obj.webp" },
    { name: "Cupid’s Bow", price: 99, imageUrl: "https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/resource/f6dd3172f50e4f4ff8d7a6bbce9d4150.png~tplv-obj.webp" },
    { name: "Mark of Love", price: 99, imageUrl: "https://p16-webcast.tiktokcdn.com/img/alisg/webcast-sg/resource/582475419a820e0b0dbc964799b6146e.png~tplv-obj.webp" },
    { name: "Rising Star", price: 99, imageUrl: "https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/resource/1c015f238086c961a72893a8c0ae18cc.png~tplv-obj.webp" },
    { name: "Sundae Bowl", price: 99, imageUrl: "https://p16-webcast.tiktokcdn.com/img/alisg/webcast-sg/resource/725ba28c17d775db510ca7b240cdd84e.png~tplv-obj.webp" },
    { name: "Club Victory", price: 99, imageUrl: "https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/resource/6639eb3590a59052babc9cb772ae4f5b.png~tplv-obj.webp" },
    { name: "Level-up Sparks", price: 99, imageUrl: "https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/resource/c6c5b0efea6f1f7e1fd1f3909284d12c.png~tplv-obj.webp" },
    { name: "Greeting Heart", price: 99, imageUrl: "https://p16-webcast.tiktokcdn.com/img/alisg/webcast-sg/resource/9325524bd9ca181bd8e76eb99b44c042.png~tplv-obj.webp" },
    { name: "Game Controller", price: 100, imageUrl: "https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/20ec0eb50d82c2c445cb8391fd9fe6e2~tplv-obj.webp" },
    { name: "Super GG", price: 100, imageUrl: "https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/resource/cbd7588c53ec3df1af0ed6d041566362.png~tplv-obj.webp" },
    { name: "Confetti", price: 100, imageUrl: "https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/cb4e11b3834e149f08e1cdcc93870b26~tplv-obj.webp" },
    { name: "Hand Hearts", price: 100, imageUrl: "https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/6cd022271dc4669d182cad856384870f~tplv-obj.webp" },
    { name: "Bouquet", price: 100, imageUrl: "https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/1bdf0b38142a94af0f71ea53da82a3b1~tplv-obj.webp" },
    { name: "Balloon Gift Box", price: 100, imageUrl: "https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/resource/c2cd98b5d3147b983fcbf35d6dd38e36.png~tplv-obj.webp" },
    { name: "Mini Star", price: 100, imageUrl: "https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/resource/483fbb7908887e111feb9d68426e33bd.png~tplv-obj.webp" },
    { name: "Match Wand", price: 100, imageUrl: "https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/resource/d1ba80bb94f93ac973bc4f30794c6d28.png~tplv-obj.webp" },
    { name: "Shell Energy", price: 100, imageUrl: "https://p16-webcast.tiktokcdn.com/img/alisg/webcast-sg/resource/78a1b653910474e4e487b30c70582dfe.png~tplv-obj.webp" },
    { name: "Heart Signal", price: 100, imageUrl: "https://p16-webcast.tiktokcdn.com/img/alisg/webcast-sg/resource/f6f8143d20ced279fbca487d3beb81c9.png~tplv-obj.webp" },
    { name: "Singing Magic", price: 100, imageUrl: "https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/resource/1b76de4373dec56480903c3d5367fd13.png~tplv-obj.webp" },
    { name: "Marvelous Confetti", price: 100, imageUrl: "https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/fccc851d351716bc8b34ec65786c727d~tplv-obj.webp" },
    { name: "Heart Rain", price: 149, imageUrl: "https://p16-webcast.tiktokcdn.com/img/alisg/webcast-sg/resource/be28619d8b8d1dc03f91c7c63e4e0260.png~tplv-obj.webp" },
    { name: "Bowknot", price: 149, imageUrl: "https://p16-webcast.tiktokcdn.com/img/alisg/webcast-sg/resource/dd02c4c2cb726134314e89abec0b5476.png~tplv-obj.webp" },
    { name: "Big Shout Out", price: 149, imageUrl: "https://p16-webcast.tiktokcdn.com/img/alisg/webcast-sg/resource/d79737225a5c68dee52b34d1a7c7dec9.png~tplv-obj.webp" },
    { name: "Chatting Popcorn", price: 149, imageUrl: "https://p16-webcast.tiktokcdn.com/img/alisg/webcast-sg/resource/f4813ddce6a6b3268df01af9fe3764d9.png~tplv-obj.webp" },
    { name: "Masquerade", price: 149, imageUrl: "https://p16-webcast.tiktokcdn.com/img/alisg/webcast-sg/resource/8fde56ae6a7ea22d3d17184ac362585f.png~tplv-obj.webp" },
    { name: "Balloon Crown", price: 149, imageUrl: "https://p16-webcast.tiktokcdn.com/img/alisg/webcast-sg/resource/d1cc3f587941bd7af50929aee49ac070.png~tplv-obj.webp" },
    { name: "Feather Tiara", price: 149, imageUrl: "https://p16-webcast.tiktokcdn.com/img/alisg/webcast-sg/resource/23a0d8c3317d8be5e5a63488a7b2b8c4.png~tplv-obj.webp" },
    { name: "Caterpillar Chaos", price: 149, imageUrl: "https://p16-webcast.tiktokcdn.com/img/alisg/webcast-sg/resource/5fc71d8f491568b0e258e2de1718e37c.png~tplv-obj.webp" },
    { name: "Love Charger", price: 199, imageUrl: "https://p16-webcast.tiktokcdn.com/img/alisg/webcast-sg/resource/4548af306fee184d43e2ced3b6f6e5cd.png~tplv-obj.webp" },
    { name: "Sunglasses", price: 199, imageUrl: "https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/08af67ab13a8053269bf539fd27f3873.png~tplv-obj.webp" },
    { name: "Hearts", price: 199, imageUrl: "https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/934b5a10dee8376df5870a61d2ea5cb6.png~tplv-obj.webp" },
    { name: "Garland Headpiece", price: 199, imageUrl: "https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/bdbdd8aeb2b69c173a3ef666e63310f3~tplv-obj.webp" },
    { name: "Love You", price: 199, imageUrl: "https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/134e51c00f46e01976399883ca4e4798~tplv-obj.webp" },
    { name: "Cheer For You", price: 199, imageUrl: "https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/1059dfa76c78dc17d7cf0a1fc2ece185~tplv-obj.webp" },
    { name: "Stinging Bee", price: 199, imageUrl: "https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/resource/c37b8f76d503f5787407a8d7c52f8cb7.png~tplv-obj.webp" },
    { name: "Massage for You", price: 199, imageUrl: "https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/resource/3ebdd3746d91eb06bdd4a04c49c3b04a.png~tplv-obj.webp" },
    { name: "Coffee Magic", price: 199, imageUrl: "https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/resource/0cb623f44c34f77fe14c2e11bfe4ee62.png~tplv-obj.webp" },
    { name: "Cheering Crab", price: 199, imageUrl: "https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/resource/7d729b6a8104f5d349ba887608cd35bc.png~tplv-obj.webp" },
    { name: "Pinch Cheek", price: 199, imageUrl: "https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/d1c75692e369466b4fd23546e513caed~tplv-obj.webp" },
    { name: "Night Star", price: 199, imageUrl: "https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/resource/3d136834fe9964927d6b30499a68b741.png~tplv-obj.webp" },
    { name: "Love Rain", price: 199, imageUrl: "https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/resource/034c891a69d337729e5202672443d15e.png~tplv-obj.webp" },
    { name: "Floating Octopus", price: 199, imageUrl: "https://p16-webcast.tiktokcdn.com/img/alisg/webcast-sg/resource/022d496f79aa50d3042f0660d37ed48a.png~tplv-obj.webp" },
    { name: "Flower Headband", price: 199, imageUrl: "https://p16-webcast.tiktokcdn.com/img/alisg/webcast-sg/resource/eaec5f24e45bc66ec44830fa5024ab45.png~tplv-obj.webp" },
    { name: "Sparklers", price: 199, imageUrl: "https://p16-webcast.tiktokcdn.com/img/alisg/webcast-sg/resource/192a873e366e2410da4fa406aba0e0af.png~tplv-obj.webp" },
    { name: "Goalkeeper Save", price: 199, imageUrl: "https://p16-webcast.tiktokcdn.com/img/alisg/webcast-sg/resource/92a80ca0eef371f0b7ae70f76f0f29d5.png~tplv-obj.webp" },
    { name: "Sour Buddy", price: 199, imageUrl: "https://p16-webcast.tiktokcdn.com/img/alisg/webcast-sg/resource/963e12ba84805721d96b06deaf5d660b.png~tplv-obj.webp" },
    { name: "Melon Juice", price: 199, imageUrl: "https://p16-webcast.tiktokcdn.com/img/alisg/webcast-sg/resource/912d29e708fe00d72487908114803e77.png~tplv-obj.webp" },
    { name: "Coconut Juice", price: 199, imageUrl: "https://p16-webcast.tiktokcdn.com/img/alisg/webcast-sg/resource/8157f47f794c8395969034574dd12082.png~tplv-obj.webp" },
    { name: "Chirpy Kisses", price: 199, imageUrl: "https://p16-webcast.tiktokcdn.com/img/alisg/webcast-sg/resource/c75ec50c453f5b09e4d25c5c69c30ed5.png~tplv-obj.webp" },
    { name: "Rose Hand", price: 199, imageUrl: "https://p16-webcast.tiktokcdn.com/img/alisg/webcast-sg/resource/805e6b8051d50ca6e6c9b74d5fc89045.png~tplv-obj.webp" },
    { name: "Rose Hand", price: 199, imageUrl: "https://p16-webcast.tiktokcdn.com/img/alisg/webcast-sg/resource/805e6b8051d50ca6e6c9b74d5fc89045.png~tplv-obj.webp" },
    { name: "Magic Genie", price: 200, imageUrl: "https://p16-webcast.tiktokcdn.com/img/alisg/webcast-sg/resource/b5e625f73f8969623a2bc9ac8fffdf24.png~tplv-obj.webp" },
    { name: "Pinch Face", price: 249, imageUrl: "https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/resource/a10aab8940d3d5aee14b14cde033ab2a.png~tplv-obj.webp" },
    { name: "Candy Bouquet", price: 249, imageUrl: "https://p16-webcast.tiktokcdn.com/img/alisg/webcast-sg/resource/935ad03446f993a3630508e5c929b7cf.png~tplv-obj.webp" },
    { name: "Star Goggles", price: 249, imageUrl: "https://p16-webcast.tiktokcdn.com/img/alisg/webcast-sg/resource/e14483e67a44ce522ba583ec923941fa.png~tplv-obj.webp" },
    { name: "Cheer Mic", price: 249, imageUrl: "https://p16-webcast.tiktokcdn.com/img/alisg/webcast-sg/resource/cf2c95f9642541fa9ebe9bdcfe6e7359.png~tplv-obj.webp" },
    { name: "Music Bubbles", price: 249, imageUrl: "https://p16-webcast.tiktokcdn.com/img/alisg/webcast-sg/resource/b5786e09eb50f1ea512b2ae9f7034254.png~tplv-obj.webp" },
    { name: "Palm Breeze", price: 249, imageUrl: "https://p16-webcast.tiktokcdn.com/img/alisg/webcast-sg/resource/dc8043965da9348b305de279cb2fb451.png~tplv-obj.webp" },
    { name: "Forest Elf", price: 249, imageUrl: "https://p16-webcast.tiktokcdn.com/img/alisg/webcast-sg/resource/1aeb39ecbb493ea520e23588df61caa1.png~tplv-obj.webp" },
    { name: "Gamer 2025", price: 299, imageUrl: "https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/resource/91058c626f0809291e7941969e4f0d05.png~tplv-obj.webp" },
    { name: "LIVE Ranking Crown", price: 299, imageUrl: "https://p16-webcast.tiktokcdn.com/img/alisg/webcast-sg/resource/1bb7f00a3adeb932e5f5518d723fedb5.png~tplv-obj.webp" },
    { name: "Kitten’s Paw", price: 299, imageUrl: "https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/resource/332520d7b5085ce591396c8d2bb9d352.png~tplv-obj.webp" },
    { name: "Boxing Gloves", price: 299, imageUrl: "https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/9f8bd92363c400c284179f6719b6ba9c~tplv-obj.webp" },
    { name: "Corgi", price: 299, imageUrl: "https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/148eef0884fdb12058d1c6897d1e02b9~tplv-obj.webp" },
    { name: "Fruit Friends", price: 299, imageUrl: "https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/resource/1153dd51308c556cb4fcc48c7d62209f.png~tplv-obj.webp" },
    { name: "Naughty Chicken", price: 299, imageUrl: "https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/resource/46a839dbc1c3e9103c71d82b35b21ad4.png~tplv-obj.webp" },
    { name: "Play for You", price: 299, imageUrl: "https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/resource/34201b86430742595e4dcb5b39560b7a.png~tplv-obj.webp" },
    { name: "Rock Star", price: 299, imageUrl: "https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/resource/57acaf0590c56c219493b71fe8d2961d.png~tplv-obj.webp" },
    { name: "Butterfly for You", price: 299, imageUrl: "https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/resource/e02af5a7d59a958bd38536f7e3473f75.png~tplv-obj.webp" },
    { name: "Starlight Compass", price: 299, imageUrl: "https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/resource/239d5419829614a89000230ece14b287.png~tplv-obj.webp" },
    { name: "Falling For You", price: 299, imageUrl: "https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/resource/2b9e1ad149b5f642a5e4371771b4e091.png~tplv-obj.webp" },
    { name: "Crystal Shoe", price: 299, imageUrl: "https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/resource/af684e26138b33fd04ab50bd35a14a7c.png~tplv-obj.webp" },
    { name: "Puppy Kisses", price: 299, imageUrl: "https://p16-webcast.tiktokcdn.com/img/alisg/webcast-sg/resource/4ae998a21159b60484169864f8968ba9.png~tplv-obj.webp" },
    { name: "Spider on web", price: 299, imageUrl: "https://p16-webcast.tiktokcdn.com/img/alisg/webcast-sg/resource/e6fc469b538b91485c7ed77ad97d3e08.png~tplv-obj.webp" },
    { name: "United Heart", price: 299, imageUrl: "https://p16-webcast.tiktokcdn.com/img/alisg/webcast-sg/resource/72ff280b8c6ce16f6efc9bf4cd6a036b.png~tplv-obj.webp" },
    { name: "Kicker Challenge", price: 299, imageUrl: "https://p16-webcast.tiktokcdn.com/img/alisg/webcast-sg/resource/8065704646452387f6bed049b194f214.png~tplv-obj.webp" },
    { name: "TikTok Crown", price: 299, imageUrl: "https://p16-webcast.tiktokcdn.com/img/alisg/webcast-sg/resource/77289ae44d635380fa88e7bdfcfdc408.png~tplv-obj.webp" },
    { name: "Hi! Rosie!", price: 299, imageUrl: "https://p16-webcast.tiktokcdn.com/img/alisg/webcast-sg/resource/c5d90ed49d326785882decc35c4200b0.png~tplv-obj.webp" },
    { name: "LIVE Ranking Crown", price: 299, imageUrl: "https://p16-webcast.tiktokcdn.com/img/alisg/webcast-sg/resource/1bb7f00a3adeb932e5f5518d723fedb5.png~tplv-obj.webp" },
    { name: "Go Hamster", price: 299, imageUrl: "https://p16-webcast.tiktokcdn.com/img/alisg/webcast-sg/resource/582131434f4f6edc3f97b96fbc33a492.png~tplv-obj.webp" },
    { name: "Pawfect", price: 299, imageUrl: "https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/resource/8710c33f4929aa91c7ec7154f5f90268.png~tplv-obj.webp" },
    { name: "Budding Heart", price: 299, imageUrl: "https://p16-webcast.tiktokcdn.com/img/alisg/webcast-sg/resource/80cc308eca861fccd859c089b0647193.png~tplv-obj.webp" },
    { name: "Feather Mask", price: 300, imageUrl: "https://p16-webcast.tiktokcdn.com/img/alisg/webcast-sg/resource/088bdb48e5051844d154948b4eb75e5f.png~tplv-obj.webp" },
    { name: "Air Dancer", price: 300, imageUrl: "https://p16-webcast.tiktokcdn.com/img/alisg/webcast-sg/resource/97c975dcce2483027ececde2b6719761.png~tplv-obj.webp" },
    { name: "Backing Monkey", price: 349, imageUrl: "https://p16-webcast.tiktokcdn.com/img/alisg/webcast-sg/resource/758b0367f5746ec6335f4374dd9b45c3.png~tplv-obj.webp" },
    { name: "Become Kitten", price: 349, imageUrl: "https://p16-webcast.tiktokcdn.com/img/alisg/webcast-sg/resource/2d89dbc83a0999ebab98b4b06d6f5ce1.png~tplv-obj.webp" },
    { name: "Marked with Love", price: 349, imageUrl: "https://p16-webcast.tiktokcdn.com/img/alisg/webcast-sg/resource/2859c21a400e1f40d93da7b68c0254d0.png~tplv-obj.webp" },
    { name: "Vinyl Flip", price: 349, imageUrl: "https://p16-webcast.tiktokcdn.com/img/alisg/webcast-sg/resource/5f5ed81e3e714fc1a30ec6efd379cd91.png~tplv-obj.webp" },
    { name: "Juicy Cap", price: 349, imageUrl: "https://p16-webcast.tiktokcdn.com/img/alisg/webcast-sg/resource/e6ce2ee0daae3693268b77efec17507f.png~tplv-obj.webp" },
    { name: "Forever Rosa", price: 399, imageUrl: "https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/resource/863e7947bc793f694acbe970d70440a1.png~tplv-obj.webp" },
    { name: "Magic Rhythm", price: 399, imageUrl: "https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/resource/00f1882035fcf9407e4b1955f0b4c48b.png~tplv-obj.webp" },
    { name: "Relaxed Goose", price: 399, imageUrl: "https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/resource/3961645e741423d7b334fb4b6488852f.png~tplv-obj.webp" },
    { name: "Tom's Hug", price: 399, imageUrl: "https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/resource/30ba2b172614d3c2da0e7caaca333b41.png~tplv-obj.webp" },
    { name: "Rosie the Rose Bean", price: 399, imageUrl: "https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/resource/3cbaea405cc61e8eaab6f5a14d127511.png~tplv-obj.webp" },
    { name: "Jollie the Joy Bean", price: 399, imageUrl: "https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/resource/0e3769575f5b7b27b67c6330376961a4.png~tplv-obj.webp" },
    { name: "Rocky the Rock Bean", price: 399, imageUrl: "https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/resource/767d7ea90f58f3676bbc5b1ae3c9851d.png~tplv-obj.webp" },
    { name: "Sage the Smart Bean", price: 399, imageUrl: "https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/resource/ed2cc456ab1a8619c5093eb8cfd3d303.png~tplv-obj.webp" },
    { name: "Sage's Slash", price: 399, imageUrl: "https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/resource/213605d4582aa3e35b51712c7a0909aa.png~tplv-obj.webp" },
    { name: "Let butterfly dances", price: 399, imageUrl: "https://p16-webcast.tiktokcdn.com/img/alisg/webcast-sg/resource/754effcbfbc5c6708c32552ab780e14b.png~tplv-obj.webp" },
    { name: "Kitten Kneading", price: 399, imageUrl: "https://p16-webcast.tiktokcdn.com/img/alisg/webcast-sg/resource/40938efafa13a17de483949934570461.png~tplv-obj.webp" },
    { name: "Shoot the Apple", price: 399, imageUrl: "https://p16-webcast.tiktokcdn.com/img/alisg/webcast-sg/resource/12a72eac62721ef031f22d935f6aac4b.png~tplv-obj.webp" },
    { name: "Alien Buddy", price: 399, imageUrl: "https://p16-webcast.tiktokcdn.com/img/alisg/webcast-sg/resource/4d39819a9bd9731b747e42a1ee650406.png~tplv-obj.webp" },
    { name: "You Are Loved", price: 399, imageUrl: "https://p16-webcast.tiktokcdn.com/img/alisg/webcast-sg/resource/4d9bbf004850dfc97cfaae9859c1c28d.png~tplv-obj.webp" },
    { name: "Rosie's Concert", price: 399, imageUrl: "https://p16-webcast.tiktokcdn.com/img/alisg/webcast-sg/resource/9e9ccba3ad69fb79462faad2d4bab4a5.png~tplv-obj.webp" },
    { name: "Crystal Dreams", price: 400, imageUrl: "https://p16-webcast.tiktokcdn.com/img/alisg/webcast-sg/resource/4e21d2956bd289847ab8c006d499d25b.png~tplv-obj.webp" },
    { name: "Wishing Cake", price: 400, imageUrl: "https://p16-webcast.tiktokcdn.com/img/alisg/webcast-sg/resource/6142c30d6b06c1c7748709e02f1293ab.png~tplv-obj.webp" },
    { name: "Mic Champ", price: 400, imageUrl: "https://p16-webcast.tiktokcdn.com/img/alisg/webcast-sg/resource/d8678a19d13ab6e2feffbea41acd0ed9.png~tplv-obj.webp" },
    { name: "Bounce Speakers", price: 400, imageUrl: "https://p16-webcast.tiktokcdn.com/img/alisg/webcast-sg/resource/fc25829fc12db52196c8606000ae17f0.png~tplv-obj.webp" },
    { name: "Beating Heart", price: 449, imageUrl: "https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/resource/11769d71ebd3c6a21f4baa7184791da9.png~tplv-obj.webp" },
    { name: "Encore Clap", price: 449, imageUrl: "https://p16-webcast.tiktokcdn.com/img/alisg/webcast-sg/resource/5b5e6863e349500d0c8ad6d67353728b.png~tplv-obj.webp" },
    { name: "Pirate's Treasure", price: 449, imageUrl: "https://p16-webcast.tiktokcdn.com/img/alisg/webcast-sg/resource/ec205551b4ed75a5a12e2dd49e70b723.png~tplv-obj.webp" },
    { name: "Fairy Mask", price: 450, imageUrl: "https://p16-webcast.tiktokcdn.com/img/alisg/webcast-sg/resource/20bfad17835a6d5d369f3e183c10e035.png~tplv-obj.webp" },
    { name: "Powerful Mind", price: 450, imageUrl: "https://p16-webcast.tiktokcdn.com/img/alisg/webcast-sg/resource/2184128b55eaef8a390a1a43a2ffdf16.png~tplv-obj.webp" },
    { name: "Hat of Joy", price: 450, imageUrl: "https://p16-webcast.tiktokcdn.com/img/alisg/webcast-sg/resource/9fcbc11bf61ee4b5790f2b3677a45ac6.png~tplv-obj.webp" },
    { name: "Coral", price: 499, imageUrl: "https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/d4faa402c32bf4f92bee654b2663d9f1~tplv-obj.webp" },
    { name: "Hands Up", price: 499, imageUrl: "https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/f4d906542408e6c87cf0a42f7426f0c6~tplv-obj.webp" },
    { name: "Halloween Ghost", price: 500, imageUrl: "https://p16-webcast.tiktokcdn.com/img/alisg/webcast-sg/resource/6adf715fd1dfef1c08214a8eed9d0336.png~tplv-obj.webp" },
    { name: "Money Gun", price: 500, imageUrl: "https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/e0589e95a2b41970f0f30f6202f5fce6~tplv-obj.webp" },
    { name: "You’re Amazing", price: 500, imageUrl: "https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/resource/b48c69f4df49c28391bcc069bbc31b41.png~tplv-obj.webp" },
    { name: "Love Balloon", price: 500, imageUrl: "https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/resource/2db38e8f2a9fb804cb7d3bd2a0ba635c.png~tplv-obj.webp" },
    { name: "VR Goggles", price: 500, imageUrl: "https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/resource/18c51791197b413bbd1b4f1b983bda36.png~tplv-obj.webp" },
    { name: "DJ Glasses", price: 500, imageUrl: "https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/resource/d4aad726e2759e54a924fbcd628ea143.png~tplv-obj.webp" },
    { name: "Dragon Crown", price: 500, imageUrl: "https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/resource/1d3f3738f57d6a45dd6df904bedd59ae.png~tplv-obj.webp" },
    { name: "Racing Helmet", price: 500, imageUrl: "https://p16-webcast.tiktokcdn.com/img/alisg/webcast-sg/resource/b9321d0563504990e8fcf73466f4c895.png~tplv-obj.webp" },
    { name: "Bunny Crown", price: 500, imageUrl: "https://p16-webcast.tiktokcdn.com/img/alisg/webcast-sg/resource/296fc5bf7a4df1db6de50d80414c5407.png~tplv-obj.webp" },
    { name: "Magic Prop", price: 500, imageUrl: "https://p16-webcast.tiktokcdn.com/img/alisg/webcast-sg/resource/51b0adff1cf290651c87ec26128658b9.png~tplv-obj.webp" },
    { name: "Gem Gun", price: 500, imageUrl: "https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/dd06007ade737f1001977590b11d3f61~tplv-obj.webp" },
    { name: "Join Butterflies", price: 600, imageUrl: "https://p16-webcast.tiktokcdn.com/img/alisg/webcast-sg/resource/79afcda7ceb1228d393f4987e12a857c.png~tplv-obj.webp" },
    { name: "Swan", price: 699, imageUrl: "https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/97a26919dbf6afe262c97e22a83f4bf1~tplv-obj.webp" },
    { name: "Colorful Wings", price: 700, imageUrl: "https://p16-webcast.tiktokcdn.com/img/alisg/webcast-sg/resource/67f29babb4506da83fed2d9143e6079b.png~tplv-obj.webp" },
    { name: "Train", price: 899, imageUrl: "https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/4227ed71f2c494b554f9cbe2147d4899~tplv-obj.webp" },
    { name: "Superstar", price: 900, imageUrl: "https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/resource/28ca7ac8e7c2359d4ae933fc37e340f8.png~tplv-obj.webp" },
    { name: "Travel with You", price: 999, imageUrl: "https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/753098e5a8f45afa965b73616c04cf89~tplv-obj.webp" },
    { name: "Lucky Airdrop Box", price: 999, imageUrl: "https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/resource/6ae56f08ae3ee57ea2dda0025bfd39d3.png~tplv-obj.webp" },
    { name: "Grand show", price: 999, imageUrl: "https://p16-webcast.tiktokcdn.com/img/alisg/webcast-sg/resource/61348c8f1a776122088de3d43fc16fab.png~tplv-obj.webp" },
    { name: "Trending Figure", price: 999, imageUrl: "https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/resource/df7b556ccf369bf9a42fe83ec8a77acf.png~tplv-obj.webp" },
    { name: "Watermelon Love", price: 1000, imageUrl: "https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/1d1650cd9bb0e39d72a6e759525ffe59~tplv-obj.webp" },
    { name: "Blooming Ribbons", price: 1000, imageUrl: "https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/resource/f76750ab58ee30fc022c9e4e11d25c9d.png~tplv-obj.webp" },
    { name: "Galaxy", price: 1000, imageUrl: "https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/resource/79a02148079526539f7599150da9fd28.png~tplv-obj.webp" },
    { name: "Glowing Jellyfish", price: 1000, imageUrl: "https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/resource/96d9226ef1c33784a24d0779ad3029d3.png~tplv-obj.webp" },
    { name: "Fairy Wings", price: 1000, imageUrl: "https://p16-webcast.tiktokcdn.com/img/alisg/webcast-sg/resource/d9798af8e406e718e66322caddf04440.png~tplv-obj.webp" },
    { name: "Flamingo Groove", price: 1000, imageUrl: "https://p16-webcast.tiktokcdn.com/img/alisg/webcast-sg/resource/ef1e4cf78bb27e6164f53e1695e7a5bc.png~tplv-obj.webp" },
    { name: "Sparkle Dance", price: 1000, imageUrl: "https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/resource/6d934aacf296e6f24d75b8b2aa4fb22f.png~tplv-obj.webp" },
    { name: "Shiny air balloon", price: 1000, imageUrl: "https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/9e7ebdca64b8f90fcc284bb04ab92d24~tplv-obj.webp" },
    { name: "Fireworks", price: 1088, imageUrl: "https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/9494c8a0bc5c03521ef65368e59cc2b8~tplv-obj.webp" },
    { name: "Magic Role", price: 1088, imageUrl: "https://p16-webcast.tiktokcdn.com/img/alisg/webcast-sg/resource/690125ff0a089e5dfc2721d6a6f35fa9.png~tplv-obj.webp" },
    { name: "Diamond", price: 1099, imageUrl: "https://p16-webcast.tiktokcdn.com/img/alisg/webcast-sg/resource/55ee5e871f7f413d24521f824682bb10.png~tplv-obj.webp" },
    { name: "Umbrella of Love", price: 1200, imageUrl: "https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/resource/3b1e8de86d841496b87567014827537b.png~tplv-obj.webp" },
    { name: "Starlight Sceptre", price: 1200, imageUrl: "https://p16-webcast.tiktokcdn.com/img/alisg/webcast-sg/resource/bcb3636b904fe6050d6a47efb1eafd2c.png~tplv-obj.webp" },
    { name: "The Running 9", price: 1399, imageUrl: "https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/resource/5d456e52403cefb87d6d78c9cabb03db.png~tplv-obj.webp" },
    { name: "Vibrant Stage", price: 1400, imageUrl: "https://p16-webcast.tiktokcdn.com/img/alisg/webcast-sg/resource/ae0a1abca4313c916e2a4e40813d90d6.png~tplv-obj.webp" },
    { name: "Level Ship", price: 1500, imageUrl: "https://p16-webcast.tiktokcdn.com/img/alisg/webcast-sg/resource/61863cebe02f25d95f187d3b0033718d.png~tplv-obj.webp" },
    { name: "Twirl & Treat", price: 1500, imageUrl: "https://p16-webcast.tiktokcdn.com/img/alisg/webcast-sg/resource/7b2cfbddcfb1f318e255a23ae44c3670.png~tplv-obj.webp" },
    { name: "Wedding", price: 1500, imageUrl: "https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/0115cb20f6629dc50d39f6b747bddf73~tplv-obj.webp" },
    { name: "Chasing the Dream", price: 1500, imageUrl: "https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/1ea8dbb805466c4ced19f29e9590040f~tplv-obj.webp" },
    { name: "Lover’s Lock", price: 1500, imageUrl: "https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/resource/f3010d1fcb008ce1b17248e5ea18b178.png~tplv-obj.webp" },
    { name: "Greeting Card", price: 1500, imageUrl: "https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/resource/dac91f95d4135654fe16d09369dd8355.png~tplv-obj.webp" },
    { name: "Future Encounter", price: 1500, imageUrl: "https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/resource/af980f4ec9ed73f3229df8dfb583abe6.png~tplv-obj.webp" },
    { name: "Under Control", price: 1500, imageUrl: "https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/resource/af67b28480c552fd8e8c0ae088d07a1d.png~tplv-obj.webp" },
    { name: "Racing Debut", price: 1500, imageUrl: "https://p16-webcast.tiktokcdn.com/img/alisg/webcast-sg/resource/b5ac8bb9da5569185bfdc1be357d3906.png~tplv-obj.webp" },
    { name: "Shooting Stars", price: 1580, imageUrl: "https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/resource/b79f212fa1831d128ed9ae78538d9485.png~tplv-obj.webp" },
    { name: "Blooming Heart", price: 1599, imageUrl: "https://p16-webcast.tiktokcdn.com/img/alisg/webcast-sg/resource/ff5453b7569d482c873163ce4b1fb703.png~tplv-obj.webp" },
    { name: "Here We Go", price: 1799, imageUrl: "https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/61b76a51a3757f0ff1cdc33b16c4d8ae~tplv-obj.webp" },
    { name: "Love Drop", price: 1800, imageUrl: "https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/1ea684b3104abb725491a509022f7c02~tplv-obj.webp" },
    { name: "Fox Legend", price: 1800, imageUrl: "https://p16-webcast.tiktokcdn.com/img/alisg/webcast-sg/resource/fac01b1cc3a676a38e749959faca9fb2.png~tplv-obj.webp" },
    { name: "Let Us Dance", price: 1999, imageUrl: "https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/resource/d042039d255b763626683fb2807c763d.png~tplv-obj.webp" },
    { name: "Star of Red Carpet", price: 1999, imageUrl: "https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/5b9bf90278f87b9ca0c286d3c8a12936~tplv-obj.webp" },
    { name: "Gift Box", price: 1999, imageUrl: "https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/9cc22f7c8ac233e129dec7b981b91b76~tplv-obj.webp" },
    { name: "Cooper Flies Home", price: 1999, imageUrl: "https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/3f1945b0d96e665a759f747e5e0cf7a9~tplv-obj.webp" },
    { name: "Mystery Firework", price: 1999, imageUrl: "https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/c110230c5db903db5f060a432f5a86cd~tplv-obj.webp" },
    { name: "Spooktacular", price: 1999, imageUrl: "https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/resource/1e5d49fc3738906892fbd873e1eb0bb9.png~tplv-obj.webp" },
    { name: "Catch the Harvest", price: 1999, imageUrl: "https://p16-webcast.tiktokcdn.com/img/alisg/webcast-sg/resource/b317a3e04d7a9c2868ba63b5bd80caa7.png~tplv-obj.webp" },
    { name: "Ribbit Ribbit", price: 2000, imageUrl: "https://p16-webcast.tiktokcdn.com/img/alisg/webcast-sg/resource/17ce759753f11358e75a3c7568eaad1b.png~tplv-obj.webp" },
    { name: "Crystal Crown", price: 2000, imageUrl: "https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/resource/4f7f618d209c8fb1f99757a42f65fa71.png~tplv-obj.webp" },
    { name: "Whale Diving", price: 2150, imageUrl: "https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/46fa70966d8e931497f5289060f9a794~tplv-obj.webp" },
    { name: "Blow Rosie Kisses", price: 2199, imageUrl: "https://p16-webcast.tiktokcdn.com/img/alisg/webcast-sg/resource/710076b6be7de742f800c4ab88fab9ff.png~tplv-obj.webp" },
    { name: "Jollie's Heartland", price: 2199, imageUrl: "https://p16-webcast.tiktokcdn.com/img/alisg/webcast-sg/resource/0eafd5c28cdb2563f3386679643abb29.png~tplv-obj.webp" },
    { name: "Rocky's Punch", price: 2199, imageUrl: "https://p16-webcast.tiktokcdn.com/img/alisg/webcast-sg/resource/d17fb8a57c708c4f07f95884131df654.png~tplv-obj.webp" },
    { name: "Sage's Coinbot", price: 2199, imageUrl: "https://p16-webcast.tiktokcdn.com/img/alisg/webcast-sg/resource/443c163954f4f7636909fb6980518745.png~tplv-obj.webp" },
    { name: "Animal Band", price: 2500, imageUrl: "https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/resource/60d8c4148c9cd0c268e570741ccf4150.png~tplv-obj.webp" },
    { name: "Motorcycle", price: 2988, imageUrl: "https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/6517b8f2f76dc75ff0f4f73107f8780e~tplv-obj.webp" },
    { name: "Pink Dream", price: 2988, imageUrl: "https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/resource/0de49ea9a79e65307c674596da517792.png~tplv-obj.webp" },
    { name: "Ice Cream Truck", price: 2988, imageUrl: "https://p16-webcast.tiktokcdn.com/img/alisg/webcast-sg/resource/858e9f4a507368b572738981e969b465.png~tplv-obj.webp" },
    { name: "Grand Prix Stage", price: 2999, imageUrl: "https://p16-webcast.tiktokcdn.com/img/alisg/webcast-sg/resource/7afdcb9f2b91256afd58e2f3d51fa0e8.png~tplv-obj.webp" },
    { name: "Rhythmic Bear", price: 2999, imageUrl: "https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/resource/16eacf541e4bd6816e88139d079519f5.png~tplv-obj.webp" },
    { name: "Love in Sunset", price: 2999, imageUrl: "https://p16-webcast.tiktokcdn.com/img/alisg/webcast-sg/resource/690750b0d08a67f0babaa1fd031ce84c.png~tplv-obj.webp" },
    { name: "Level-up Spotlight", price: 2999, imageUrl: "https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/resource/9a87567b4bb63b175f146745af412bb5.png~tplv-obj.webp" },
    { name: "Meteor Shower", price: 3000, imageUrl: "https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/71883933511237f7eaa1bf8cd12ed575~tplv-obj.webp" },
    { name: "Gift Box", price: 3999, imageUrl: "https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/3646c259f8ce6f79c762ad00ce51dda0~tplv-obj.webp" },
    { name: "Magic World", price: 4088, imageUrl: "https://p16-webcast.tiktokcdn.com/img/alisg/webcast-sg/resource/a91fdba590b29bab1287ec746d8323a8.png~tplv-obj.webp" },
    { name: "Your Concert", price: 4500, imageUrl: "https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/resource/86c9c8fb5aa76488b075f139dd575dfe.png~tplv-obj.webp" },
    { name: "Private Jet", price: 4888, imageUrl: "https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/921c6084acaa2339792052058cbd3fd3~tplv-obj.webp" },
    { name: "Leon the Kitten", price: 4888, imageUrl: "https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/a7748baba012c9e2d98a30dce7cc5a27~tplv-obj.webp" },
    { name: "Fiery Dragon", price: 4888, imageUrl: "https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/resource/8d1281789de0a5dfa69f90ecf0dc1534.png~tplv-obj.webp" },
    { name: "Signature Jet", price: 4888, imageUrl: "https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/fe27eba54a50c0a687e3dc0f2c02067d~tplv-obj.webp" },
    { name: "Tom's Love", price: 4999, imageUrl: "https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/resource/78e36dd021a63ee2c9e4d9e1f222967e.png~tplv-obj.webp" },
    { name: "Sage’s Venture", price: 4999, imageUrl: "https://p16-webcast.tiktokcdn.com/img/alisg/webcast-sg/resource/ea291160b9b69dc5d13938433ba0fae9.png~tplv-obj.webp" },
    { name: "Hero Space Ship", price: 4999, imageUrl: "https://p16-webcast.tiktokcdn.com/img/alisg/webcast-sg/resource/a384835f6b1fe38987645cbe933f623c.png~tplv-obj.webp" },
    { name: "Big Fandom", price: 5000, imageUrl: "https://p16-webcast.tiktokcdn.com/img/alisg/webcast-sg/resource/4eeae3f545047592943fea3fb67205f3.png~tplv-obj.webp" },
    { name: "Flying Jets", price: 5000, imageUrl: "https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/resource/1d067d13988e8754ed6adbebd89b9ee8.png~tplv-obj.webp" },
    { name: "Diamond Gun", price: 5000, imageUrl: "https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/resource/651e705c26b704d03bc9c06d841808f1.png~tplv-obj.webp" },
    { name: "Devoted Heart", price: 5999, imageUrl: "https://p16-webcast.tiktokcdn.com/img/alisg/webcast-sg/resource/bc3e9b4ce077044956fee2ded85f8ff7.png~tplv-obj.webp" },
    { name: "Future City", price: 6000, imageUrl: "https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/resource/963b7c25aa2cedc0de22358342645e87.png~tplv-obj.webp" },
    { name: "Sam in New City", price: 6000, imageUrl: "https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/resource/291de897e4a8c3b72c358a9734c5b7d8.png~tplv-obj.webp" },
    { name: "Work Hard Play Harder", price: 6000, imageUrl: "https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/resource/3257e15b3f6697aed88b4ac51b816603.png~tplv-obj.webp" },
    { name: "Strong Finish", price: 6000, imageUrl: "https://p16-webcast.tiktokcdn.com/img/alisg/webcast-sg/resource/9ad035b088dfeaf298fdc9cd84d50000.png~tplv-obj.webp" },
    { name: "Lili the Leopard", price: 6599, imageUrl: "https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/resource/7be03e1af477d1dbc6eb742d0c969372.png~tplv-obj.webp" },
    { name: "Celebration Time", price: 6999, imageUrl: "https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/e73e786041d8218d8e9dbbc150855f1b~tplv-obj.webp" },
    { name: "Happy Party", price: 6999, imageUrl: "https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/41774a8ba83c59055e5f2946d51215b4~tplv-obj.webp" },
    { name: "Sports Car", price: 7000, imageUrl: "https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/e7ce188da898772f18aaffe49a7bd7db~tplv-obj.webp" },
    { name: "Star Throne", price: 7999, imageUrl: "https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/30063f6bc45aecc575c49ff3dbc33831~tplv-obj.webp" },
    { name: "Star Throne", price: 7999, imageUrl: "https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/30063f6bc45aecc575c49ff3dbc33831~tplv-obj.webp" },
    { name: "Leon and Lili", price: 9699, imageUrl: "https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/resource/6958244f3eeb69ce754f735b5833a4aa.png~tplv-obj.webp" },
    { name: "Interstellar", price: 10000, imageUrl: "https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/8520d47b59c202a4534c1560a355ae06~tplv-obj.webp" },
    { name: "Sunset Speedway", price: 10000, imageUrl: "https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/df63eee488dc0994f6f5cb2e65f2ae49~tplv-obj.webp" },
    { name: "Luxury Yacht", price: 10000, imageUrl: "https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/resource/a97ef636c4e0494b2317c58c9edba0a8.png~tplv-obj.webp" },
    { name: "Red Lightning", price: 12000, imageUrl: "https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/5f48599c8d2a7bbc6e6fcf11ba2c809f~tplv-obj.webp" },
    { name: "White Wolf", price: 12000, imageUrl: "https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/resource/c8d7768c3f96e945ae1b7e6baf3a1a0b.png~tplv-obj.webp" },
    { name: "Level-up Spectacle", price: 12999, imageUrl: "https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/resource/52a09724bbe8d78227db67bc5fe78613.png~tplv-obj.webp" },
    { name: "Fate Sphere", price: 14999, imageUrl: "https://p16-webcast.tiktokcdn.com/img/alisg/webcast-sg/resource/86ccce0fbc0753f9494a19673f138d4a.png~tplv-obj.webp" },
    { name: "Scythe of Justice", price: 14999, imageUrl: "https://p16-webcast.tiktokcdn.com/img/alisg/webcast-sg/resource/5d5ced6572464c1cf2b0deb92845014b.png~tplv-obj.webp" },
    { name: "Crystal Heart", price: 14999, imageUrl: "https://p16-webcast.tiktokcdn.com/img/alisg/webcast-sg/resource/08095e18ae3da6ad5dcf23ce68eb1483.png~tplv-obj.webp" },
    { name: "Boo Town", price: 15000, imageUrl: "https://p16-webcast.tiktokcdn.com/img/alisg/webcast-sg/resource/c836c81cc6e899fe392a3d11f69fafa3.png~tplv-obj.webp" },
    { name: "Rosa Nebula", price: 15000, imageUrl: "https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/resource/f722088231103b66875dae33f13f8719.png~tplv-obj.webp" },
    { name: "Look! Meteor Shower", price: 15000, imageUrl: "https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/resource/bebbeaf482b8602b0a2b8c2f7b161022.png~tplv-obj.webp" },
    { name: "Future Journey", price: 15000, imageUrl: "https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/resource/dd615b15ed696ee886064d5415dab688.png~tplv-obj.webp" },
    { name: "Party On&On", price: 15000, imageUrl: "https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/resource/c45505ece4a91d9c43e4ba98a000b006.png~tplv-obj.webp" },
    { name: "Amusement Park", price: 17000, imageUrl: "https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/resource/12ecc01c2984c5d85bb508e80103a3cb.png~tplv-obj.webp" },
    { name: "Fly Love", price: 19999, imageUrl: "https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/a598ba4c7024f4d46c1268be4d82f901~tplv-obj.webp" },
    { name: "TikTok Shuttle", price: 20000, imageUrl: "https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/8ef48feba8dd293a75ae9d4376fb17c9~tplv-obj.webp" },
    { name: "Premium Shuttle", price: 20000, imageUrl: "https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/c2b287adee5151b7889d6e3d45b72e44~tplv-obj.webp" },
    { name: "Level Ship", price: 21000, imageUrl: "https://p16-webcast.tiktokcdn.com/img/alisg/webcast-sg/resource/aca72c59f99d08b0c0d1cd6cc79dbb16.png~tplv-obj.webp" },
    { name: "Infinite Heart", price: 23999, imageUrl: "https://p16-webcast.tiktokcdn.com/img/alisg/webcast-sg/resource/de31974d7a94525c6f31872b5b38f76e.png~tplv-obj.webp" },
    { name: "Stellar Ark", price: 25999, imageUrl: "https://p16-webcast.tiktokcdn.com/img/alisg/webcast-sg/resource/c0fb6008b8fb11611f87076dbb52989b.png~tplv-obj.webp" },
    { name: "Phoenix", price: 25999, imageUrl: "https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/ef248375c4167d70c1642731c732c982~tplv-obj.webp" },
    { name: "Adam’s Dream", price: 25999, imageUrl: "https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/9a586391fbb1e21621c4203e5563a9e0~tplv-obj.webp" },
    { name: "Gate of Trial", price: 25999, imageUrl: "https://p16-webcast.tiktokcdn.com/img/alisg/webcast-sg/resource/0a36e4896f5d60399a8389c043a23edf.png~tplv-obj.webp" },
    { name: "Dragon Flame", price: 26999, imageUrl: "https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/89b4d1d93c1cc614e3a0903ac7a94e0c~tplv-obj.webp" },
    { name: "Lion", price: 29999, imageUrl: "https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/4fb89af2082a290b37d704e20f4fe729~tplv-obj.webp" },
    { name: "Leon and Lion", price: 34000, imageUrl: "https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/a291aedacf27d22c3fd2d83575d2bee9~tplv-obj.webp" },
    { name: "TikTok Universe+", price: 34999, imageUrl: "https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/b13105782e8bf8fbefaa83b7af413cee~tplv-obj.webp" },
    { name: "TikTok Stars", price: 39999, imageUrl: "https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/b1667c891ed39fd68ba7252fff7a1e7c~tplv-obj.webp" },
    { name: "Thunder Falcon", price: 39999, imageUrl: "https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/26f3fbcda383e6093a19b8e7351a164c~tplv-obj.webp" },
    { name: "Fire Phoenix", price: 41999, imageUrl: "https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/resource/bfb8425a7e8fa03f9fec05a973a4a506.png~tplv-obj.webp" },
    { name: "Magic Marcia", price: 42999, imageUrl: "https://p16-webcast.tiktokcdn.com/img/alisg/webcast-sg/resource/10b24e92368a854fec1e487712b18a33.png~tplv-obj.webp" },
    { name: "King of Legends", price: 42999, imageUrl: "https://p16-webcast.tiktokcdn.com/img/alisg/webcast-sg/resource/3790b60a52697daa138bf8d0ec27242f.png~tplv-obj.webp" },
    { name: "Pegasus", price: 42999, imageUrl: "https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/resource/f600a2495ab5d250e7da2066484a9383.png~tplv-obj.webp" },
    { name: "TikTok Universe", price: 44999, imageUrl: "https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/8f471afbcebfda3841a6cc515e381f58~tplv-obj.webp" },
    { name: "TikTok Universe", price: 44999, imageUrl: "https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/8f471afbcebfda3841a6cc515e381f58~tplv-obj.webp" },
    ];
  // Sounds có sẵn
  const availableSounds = [
    { name: "Default", file: "default.mp3", description: "Default notification sound" },
    { name: "Rose", file: "rose.mp3", description: "Gentle rose gift sound" },
    { name: "Heart", file: "heart.mp3", description: "Love heart sound" },
    { name: "Diamond", file: "diamond.mp3", description: "Expensive diamond sound" },
    { name: "Rocket", file: "rocket.mp3", description: "Rocket launch sound" },
    { name: "Victory", file: "victory.mp3", description: "Victory celebration sound" },
    { name: "Notification", file: "notification.mp3", description: "Simple notification" },
    { name: "Chime", file: "chime.mp3", description: "Soft chime sound" },
    { name: "Bell", file: "bell.mp3", description: "Bell ring sound" },
    { name: "Success", file: "success.mp3", description: "Success achievement sound" }
  ];

  useEffect(() => {
    if (!token) {
      navigate("/login");
      return;
    }
    const payload = decodeJwtPayload(token);
    if (!payload || payload.role !== "game") {
      navigate(payload ? (payload.role === "admin" ? "/admin" : "/dashboard") : "/login");
      return;
    }
    setAuthorized(true);
    setUsername(payload.username || "");
    fetchData();
    connectSocket();
    return () => {
      disconnectSocket();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    if (socketRef.current && username) {
      socketRef.current.emit("join:game");
    }
  }, [username]);

  function connectSocket() {
    try {
      socketRef.current = io(API_URL, { auth: { token } });
      socketRef.current.on("connect", () => {
        console.log("Connected to socket");
      });
      socketRef.current.on("stats:update", (newStats) => {
        setStats(newStats);
      });
    } catch (err) {
      console.error("Socket connect error", err);
    }
  }

  function disconnectSocket() {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
  }

  async function fetchData() {
    try {
      api.defaults.headers.Authorization = token ? `Bearer ${token}` : undefined;
      
      // Fetch presets
      const { data: presetsData } = await api.get("/api/game/presets");
      if (presetsData.ok && Array.isArray(presetsData.presets)) {
        setPresets(presetsData.presets);
      }
      
      // Fetch overlay
      const { data: overlayData } = await api.get("/api/game/overlay");
      if (overlayData.ok) {
        const data = overlayData.overlay || {};
        setOverlay(data);
        setOverlayUrls(data);
      }
      
      // Fetch TikTok accounts
      const { data: accountsData } = await api.get("/api/accounts");
      if (accountsData.ok && Array.isArray(accountsData.accounts)) {
        setTiktokAccounts(accountsData.accounts);
      }
      
      // Auto-generate overlay URLs if not set
      if (!overlayUrls.goalLikes && !overlayUrls.smartBar && !overlayUrls.topGifters && !overlayUrls.giftPresets) {
        generateOverlayUrls();
      }

      // Fetch plugin key
      try {
        const { data: keyData } = await api.get("/api/accounts/plugin-key");
        if (keyData.ok && keyData.pluginKey) {
          setPluginKey(keyData.pluginKey);
        }
      } catch (err) {
        console.error("Failed to fetch plugin key:", err);
      }
      
      // Add default Minecraft game presets if none exist
      if (presets.length === 0) {
        await addDefaultMinecraftPresets();
      }
    } catch (err) {
      console.error("Failed to fetch data:", err);
      toast.error("Failed to load data");
    }
  }

  function selectTiktokAccount(account) {
    setSelectedTiktokAccount(account);
    // Regenerate overlay URLs for selected account
    generateOverlayUrls();
    toast.success(`Selected TikTok account: ${account.username}`);
  }

  async function generatePluginKey() {
    try {
      const { data: keyData } = await api.get("/api/accounts/plugin-key");
      if (keyData.ok && keyData.pluginKey) {
        setPluginKey(keyData.pluginKey);
        toast.success("Plugin key generated successfully!");
      }
    } catch (err) {
      console.error("Failed to generate plugin key:", err);
      toast.error("Failed to generate plugin key");
    }
  }

  function copyPluginKey() {
    if (pluginKey) {
      navigator.clipboard.writeText(pluginKey);
      toast.success("Plugin key copied to clipboard!");
    }
  }

  // Function Editor handlers
  const handleOpenFunctionEditor = (functionData = null, presetData = null) => {
    setCurrentFunction(functionData);
    setShowFunctionEditor(true);
    
    // If opening from a preset, pre-fill the function data
    if (presetData) {
      setCurrentFunction({
        id: Date.now().toString(),
        name: `${presetData.giftName} Function`,
        hideInOverlay: false,
        repetition: 1,
        delay: 0,
        interval: 100,
        repetitionMultiplier: true,
        commands: presetData.commands || [""],
        sound: presetData.soundFile || "default.mp3",
        volume: 50,
        punishmentImage: null,
        presetId: presetData.id,
        giftName: presetData.giftName,
        imageUrl: presetData.imageUrl
      });
    }
  };

  const handleSaveFunction = async (functionData) => {
    try {
      // If this function is linked to a preset, update the preset
      if (functionData.presetId) {
        const updatedPreset = {
          ...presets.find(p => p.id === functionData.presetId),
          commands: functionData.commands,
          soundFile: functionData.sound,
          punishmentImage: functionData.punishmentImage,
          repetition: functionData.repetition,
          delay: functionData.delay,
          interval: functionData.interval,
          hideInOverlay: functionData.hideInOverlay
        };
        
        // Update preset in backend
        const response = await api.put(`/game/presets/${functionData.presetId}`, updatedPreset);
        if (response.data.ok) {
          // Update local state
          setPresets(presets.map(p => p.id === functionData.presetId ? updatedPreset : p));
          toast.success("Gift Preset updated with function settings!");
        } else {
          throw new Error(response.data.error || 'Failed to update preset');
        }
      }
      
      // Update or add function
      if (currentFunction) {
        setFunctions(functions.map(f => f.id === functionData.id ? functionData : f));
        toast.success("Function updated successfully!");
      } else {
        setFunctions([...functions, functionData]);
        toast.success("Function created successfully!");
      }
    } catch (error) {
      console.error("Error saving function:", error);
      toast.error("Failed to save function settings");
    }
  };

  const handleDeleteFunction = (functionId) => {
    setFunctions(functions.filter(f => f.id !== functionId));
    toast.success("Function deleted successfully!");
  };

  // Sound upload handler
  const handleSoundUpload = async (file) => {
    try {
      const formData = new FormData();
      formData.append('sound', file);
      
      const response = await api.post('/upload/sound', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      if (response.data.ok) {
        setUploadedSound(file);
        toast.success(`Sound uploaded: ${file.name}`);
      } else {
        throw new Error(response.data.error || 'Upload failed');
      }
    } catch (error) {
      console.error('Sound upload error:', error);
      toast.error('Failed to upload sound file');
    }
  };

  async function addPreset() {
    // Input validation and sanitization
    if (!newPreset.giftName || !newPreset.giftName.trim()) {
      toast.error("Please select a gift");
      return;
    }

    if (!newPreset.commands || newPreset.commands.length === 0 || !newPreset.commands[0].trim()) {
      toast.error("Please enter at least one command");
      return;
    }
    
    // Validate gift name length and characters
    if (newPreset.giftName.length > 100) {
      toast.error("Gift name is too long (max 100 characters)");
      return;
    }
    
    // Validate commands
    const validCommands = newPreset.commands.filter(cmd => cmd && cmd.trim().length > 0);
    if (validCommands.length === 0) {
      toast.error("Please enter at least one valid command");
      return;
    }
    
    // Check for potentially dangerous commands
    const dangerousPatterns = [/<script/i, /javascript:/i, /on\w+\s*=/i];
    for (const command of validCommands) {
      if (dangerousPatterns.some(pattern => pattern.test(command))) {
        toast.error("Commands contain potentially unsafe content");
        return;
      }
    }

    try {
      const preset = {
        id: Date.now().toString(),
        ...newPreset,
        giftName: newPreset.giftName.trim(),
        commands: (newPreset.commands || []).map((cmd) => cmd.trim()).filter(Boolean),
        createdAt: new Date().toISOString()
      };

      const updatedPresets = [...presets, preset];
      const targetUsername = selectedTiktokAccount?.username || username || "123";
      
      await api.post("/api/game/presets", { 
        username: targetUsername,
        presets: updatedPresets 
      });
      setPresets(updatedPresets);
      setNewPreset({ giftName: "", coinsPerUnit: 1, commands: [""], soundFile: "default.mp3", imageUrl: "", enabled: true });
      setSelectedGift(null);
      setSelectedSound(null);
      toast.success("Preset added successfully");
      
      // Refresh overlay URLs after adding preset
      generateOverlayUrls();
    } catch (err) {
      console.error("Failed to add preset:", err);
      toast.error("Failed to add preset");
    }
  }

  async function updatePreset(preset) {
    try {
      const payload = {
        ...preset,
        commands: (preset.commands || []).map((cmd) => cmd.trim()).filter(Boolean)
      };
      await api.patch(`/api/game/presets/${preset.id}`, payload);
      const updatedPresets = presets.map((p) => (p.id === preset.id ? payload : p));
      setPresets(updatedPresets);
      setEditingPreset(null);
      toast.success("Preset updated successfully");
    } catch (err) {
      console.error("Failed to update preset:", err);
      toast.error("Failed to update preset");
    }
  }

  async function deletePreset(id) {
    try {
      await api.delete(`/api/game/presets/${id}`);
      const updatedPresets = presets.filter((p) => p.id !== id);
      setPresets(updatedPresets);
      toast.success("Preset deleted successfully");
    } catch (err) {
      console.error("Failed to delete preset:", err);
      toast.error("Failed to delete preset");
    }
  }

  async function updateOverlay() {
    try {
      await api.post("/api/game/overlay", overlayUrls);
      setOverlay(overlayUrls);
      toast.success("Overlay URLs updated successfully");
    } catch (err) {
      console.error("Failed to update overlay:", err);
      toast.error("Failed to update overlay");
    }
  }

  function copyToClipboard(text) {
    navigator.clipboard.writeText(text);
    toast.success("URL copied to clipboard");
  }

  function testSound(soundFile) {
    // In a real implementation, this would play the sound
    toast.success(`Playing sound: ${soundFile}`);
  }

  function handleGiftSelect(gift) {
    setSelectedGift(gift);
    setNewPreset({
      ...newPreset,
      giftName: gift.name,
      imageUrl: gift.imageUrl,
      coinsPerUnit: gift.price
    });
    setShowGiftSelector(false);
  }

  function handleSoundSelect(sound) {
    setSelectedSound(sound);
    setNewPreset({
      ...newPreset,
      soundFile: sound.file
    });
    setShowSoundSelector(false);
  }


  function generateOverlayUrls() {
    // Use backend port (3001) for overlay URLs, not frontend port (5173)
    const baseUrl = window.location.origin.replace("5173", "3001");
    const targetUsername = selectedTiktokAccount?.username || username;
    const newUrls = {
      goalLikes: `${baseUrl}/overlay/goal-likes/${targetUsername}`,
      smartBar: `${baseUrl}/overlay/smart-bar/${targetUsername}`,
      topGifters: `${baseUrl}/overlay/top-gifters/${targetUsername}`,
      giftPresets: `${baseUrl}/overlay/gift-presets/${targetUsername}`
    };
    setOverlayUrls(newUrls);
    setOverlay(newUrls);
  }

  async function addTiktokAccount() {
    if (!newTiktokAccount.username.trim()) {
      toast.error("Please enter a TikTok username");
      return;
    }

    try {
      const account = {
        username: newTiktokAccount.username.trim(),
        settings: {
          description: newTiktokAccount.description.trim()
        }
      };

      await api.post("/api/accounts", account);
      await fetchAccounts(); // Refresh accounts list
      setNewTiktokAccount({ username: "", description: "" });
      toast.success("TikTok account added successfully");
    } catch (err) {
      console.error("Failed to add TikTok account:", err);
      toast.error("Failed to add TikTok account");
    }
  }

  async function deleteTiktokAccount(accountId) {
    try {
      await api.delete(`/api/accounts/${accountId}`);
      await fetchAccounts(); // Refresh accounts list
      toast.success("TikTok account deleted successfully");
    } catch (err) {
      console.error("Failed to delete TikTok account:", err);
      toast.error("Failed to delete TikTok account");
    }
  }

  async function fetchAccounts() {
    try {
      api.defaults.headers.Authorization = token ? `Bearer ${token}` : undefined;
      const { data: accountsData } = await api.get("/api/accounts");
      if (accountsData.ok && Array.isArray(accountsData.accounts)) {
        setTiktokAccounts(accountsData.accounts);
      }
    } catch (err) {
      console.error("Failed to fetch accounts:", err);
    }
  }

  async function startTiktokListener(accountId) {
    try {
      await api.post(`/api/accounts/${accountId}/start`);
      await fetchAccounts(); // Refresh to get updated status
      toast.success("TikTok listener started!");
    } catch (err) {
      console.error("Failed to start listener:", err);
      toast.error("Failed to start TikTok listener");
    }
  }

  async function stopTiktokListener(accountId) {
    try {
      await api.post(`/api/accounts/${accountId}/stop`);
      await fetchAccounts(); // Refresh to get updated status
      toast.success("TikTok listener stopped!");
    } catch (err) {
      console.error("Failed to stop listener:", err);
      toast.error("Failed to stop TikTok listener");
    }
  }

  async function addDefaultMinecraftPresets() {
    const defaultPresets = [
      {
        id: "rose",
        giftName: "Rose",
        coinsPerUnit: 1,
        commands: ["/bedrock tnt"],
        soundFile: "rose.mp3",
        imageUrl: "https://cdn-icons-png.flaticon.com/512/686/686589.png",
        enabled: true
      },
      {
        id: "heart",
        giftName: "Heart",
        coinsPerUnit: 2,
        commands: ["/bedrock create 5 5"],
        soundFile: "heart.mp3",
        imageUrl: "https://cdn-icons-png.flaticon.com/512/686/686589.png",
        enabled: true
      },
      {
        id: "crown",
        giftName: "Crown",
        coinsPerUnit: 5,
        commands: ["/bedrock autowin"],
        soundFile: "victory.mp3",
        imageUrl: "https://cdn-icons-png.flaticon.com/512/686/686589.png",
        enabled: true
      },
      {
        id: "birthday_cake",
        giftName: "Birthday Cake",
        coinsPerUnit: 10,
        commands: ["/bedrock fireworks"],
        soundFile: "success.mp3",
        imageUrl: "https://cdn-icons-png.flaticon.com/512/686/686589.png",
        enabled: true
      },
      {
        id: "corgi",
        giftName: "Corgi",
        coinsPerUnit: 3,
        commands: ["/bedrock tnt", "/bedrock create 3 3"],
        soundFile: "notification.mp3",
        imageUrl: "https://cdn-icons-png.flaticon.com/512/686/686589.png",
        enabled: true
      }
    ];

    try {
      await api.post("/api/game/presets", { presets: defaultPresets });
      setPresets(defaultPresets);
      toast.success("Default TikTok gift presets added!");
    } catch (err) {
      console.error("Failed to add default presets:", err);
    }
  }

  function handleLogout() {
    localStorage.removeItem("token");
    if (onLogout) onLogout();
    navigate("/login");
  }

  if (!authorized) {
    return null;
  }

  return (
    <ErrorBoundary>
      <AppShell
        title="TikTok Stream Dashboard"
        subtitle={`User: ${username} | Minecraft Integration`}
        actions={
        <div className="flex items-center gap-3">
          <TokenStatus />
          <button
            onClick={() => navigate("/dashboard")}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            TikTok Dashboard
          </button>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Logout
          </button>
        </div>
      }
    >
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white/5 border border-cyan-500/20 p-6 rounded-2xl shadow-lg shadow-cyan-500/10">
          <div className="text-yellow-300 text-2xl font-bold">{stats.coins}</div>
          <div className="text-cyan-200/80 text-sm">Coins</div>
        </div>
        <div className="bg-white/5 border border-cyan-500/20 p-6 rounded-2xl shadow-lg shadow-cyan-500/10">
          <div className="text-green-300 text-2xl font-bold">{stats.viewers}</div>
          <div className="text-cyan-200/80 text-sm">Viewers</div>
        </div>
        <div className="bg-white/5 border border-cyan-500/20 p-6 rounded-2xl shadow-lg shadow-cyan-500/10">
          <div className="text-purple-300 text-2xl font-bold">{stats.winGoal}</div>
          <div className="text-cyan-200/80 text-sm">Win Goal</div>
        </div>
        <div className="bg-white/5 border border-cyan-500/20 p-6 rounded-2xl shadow-lg shadow-cyan-500/10">
          <div className="text-orange-300 text-2xl font-bold">{stats.timer}s</div>
          <div className="text-cyan-200/80 text-sm">Timer</div>
        </div>
      </div>

      {/* TikTok Account Management */}
      <div className="bg-white/5 border border-cyan-500/20 p-6 rounded-2xl shadow-lg shadow-cyan-500/10 mb-6">
        <h2 className="text-xl font-bold text-white mb-4">TikTok Account Management</h2>
        
        {/* Plugin Key Section */}
        <div className="bg-purple-500/20 border border-purple-500/50 p-4 rounded-lg mb-4">
          <h3 className="text-purple-200 font-semibold mb-3">🔑 Minecraft Plugin Key</h3>
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <input
                type="text"
                value={pluginKey}
                readOnly
                placeholder="Generate a plugin key to use in Minecraft"
                className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded text-white text-sm font-mono"
              />
            </div>
            <button
              onClick={generatePluginKey}
              className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors"
            >
              Generate
            </button>
            <button
              onClick={copyPluginKey}
              disabled={!pluginKey}
              className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Copy
            </button>
          </div>
          <div className="text-purple-200/80 text-xs mt-2">
            ⚠️ This key is valid for 24 hours. Use this key in your Minecraft plugin configuration.
          </div>
        </div>

        {/* Function Editor Section */}
        <div className="bg-blue-500/20 border border-blue-500/50 p-4 rounded-lg mb-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-blue-200 font-semibold">⚡ Function Editor</h3>
            <button
              onClick={() => handleOpenFunctionEditor()}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm"
            >
              + Add Function
            </button>
          </div>
          
          {functions.length > 0 ? (
            <div className="space-y-2">
              {functions.map((func) => (
                <div key={func.id} className="flex items-center justify-between p-3 bg-gray-800/50 rounded">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center">
                      <span className="text-white text-sm">⚡</span>
                    </div>
                    <div>
                      <div className="text-white font-semibold text-sm">{func.name}</div>
                      <div className="text-gray-400 text-xs">
                        {func.commands?.length || 0} commands • {func.repetition}x repetition
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleOpenFunctionEditor(func)}
                      className="px-3 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteFunction(func.id)}
                      className="px-3 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700 transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-gray-400">
              <div className="text-2xl mb-2">⚡</div>
              <div className="text-sm">No functions created yet</div>
              <div className="text-xs">Create custom functions with commands and sounds</div>
            </div>
          )}
        </div>

        {/* Selected Account Display */}
        {selectedTiktokAccount && (
          <div className="bg-emerald-500/20 border border-emerald-500/50 p-4 rounded-lg mb-4">
            <h3 className="text-emerald-200 font-semibold mb-2">Currently Selected Account</h3>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-white font-bold">@{selectedTiktokAccount.username}</div>
                <div className="text-emerald-200/80 text-sm">{selectedTiktokAccount.settings?.description || 'No description'}</div>
              </div>
              <button
                onClick={() => setSelectedTiktokAccount(null)}
                className="px-3 py-1 bg-red-500/80 text-white rounded text-sm hover:bg-red-500 transition"
              >
                Deselect
              </button>
            </div>
          </div>
        )}
        
        <div className="bg-black/30 border border-white/10 p-4 rounded-lg mb-4">
          <h3 className="text-white font-semibold mb-3">Add New TikTok Account</h3>
          <div className="grid grid-cols-2 gap-3">
            <input
              value={newTiktokAccount.username}
              onChange={(e) => setNewTiktokAccount({ ...newTiktokAccount, username: e.target.value })}
              placeholder="TikTok Username (e.g., @username)"
              className="px-3 py-2 bg-white/10 border border-white/20 rounded text-white placeholder-blue-200"
            />
            <input
              value={newTiktokAccount.description}
              onChange={(e) => setNewTiktokAccount({ ...newTiktokAccount, description: e.target.value })}
              placeholder="Description (optional)"
              className="px-3 py-2 bg-white/10 border border-white/20 rounded text-white placeholder-blue-200"
            />
          </div>
          <button
            onClick={addTiktokAccount}
            className="mt-3 px-4 py-2 bg-emerald-500 text-black font-semibold rounded-lg hover:bg-emerald-400 transition"
          >
            Add TikTok Account
          </button>
        </div>

        <div className="space-y-3 max-h-48 overflow-y-auto">
          {tiktokAccounts.map((account) => (
            <div key={account.id} className="bg-black/30 border border-white/10 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="text-white font-semibold">@{account.username}</div>
                  <div className="text-cyan-200/80 text-sm space-y-1">
                    {account.settings?.description && <div>Description: {account.settings.description}</div>}
                    <div>Status: {account.status || "inactive"}</div>
                    <div>Created: {new Date(account.createdAt).toLocaleDateString()}</div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => selectTiktokAccount(account)}
                    className={`px-3 py-1 rounded text-sm transition ${
                      selectedTiktokAccount?.id === account.id
                        ? 'bg-blue-600 text-white'
                        : 'bg-blue-500/80 text-white hover:bg-blue-600'
                    }`}
                  >
                    {selectedTiktokAccount?.id === account.id ? 'Selected' : 'Select'}
                  </button>
                  <button
                    onClick={() => startTiktokListener(account.id)}
                    className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                  >
                    Start
                  </button>
                  <button
                    onClick={() => stopTiktokListener(account.id)}
                    className="px-3 py-1 bg-yellow-600 text-white rounded text-sm hover:bg-yellow-700"
                  >
                    Stop
                  </button>
                  <button
                    onClick={() => deleteTiktokAccount(account.id)}
                    className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
          {tiktokAccounts.length === 0 && (
            <div className="text-center text-cyan-200/70 py-4">No TikTok accounts added yet.</div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white/5 border border-cyan-500/20 p-6 rounded-2xl shadow-lg shadow-cyan-500/10">
          <h2 className="text-xl font-bold text-white mb-4">TikTok Gift Presets</h2>

          <div className="bg-black/30 border border-white/10 p-4 rounded-lg mb-4">
            <h3 className="text-white font-semibold mb-3">Add New Preset</h3>
            <div className="space-y-3">
              {/* Gift Selection */}
              <div>
                <label className="text-white text-sm mb-1 block">Select TikTok Gift</label>
                <button
                  onClick={() => setShowGiftSelector(true)}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded text-white text-left flex items-center justify-between"
                >
                  <span>
                    {selectedGift ? (
                      <div className="flex items-center gap-2">
                        <img 
                          src={selectedGift.imageUrl} 
                          alt={selectedGift.name}
                          className="w-6 h-6 object-contain"
                        />
                        <span>{selectedGift.name}</span>
                      </div>
                    ) : (
                      "Click to select gift"
                    )}
                  </span>
                  <span>▼</span>
                </button>
              </div>

              {/* Coins per unit */}
              <div>
                <label className="text-white text-sm mb-1 block">Coins per unit</label>
                <input
                  type="number"
                  value={newPreset.coinsPerUnit}
                  onChange={(e) => setNewPreset({ ...newPreset, coinsPerUnit: parseInt(e.target.value, 10) || 1 })}
                  placeholder="1"
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded text-white placeholder-blue-200"
                />
              </div>

              {/* Sound Selection */}
              <div>
                <label className="text-white text-sm mb-1 block">Select Sound</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowSoundSelector(true)}
                    className="flex-1 px-3 py-2 bg-white/10 border border-white/20 rounded text-white text-left flex items-center justify-between"
                  >
                    <span>
                      {selectedSound ? selectedSound.name : "Choose from library"}
                    </span>
                    <span>▼</span>
                  </button>
                  <input
                    type="file"
                    accept="audio/*"
                    onChange={handleSoundUpload}
                    className="hidden"
                    id="sound-upload"
                  />
                  <label
                    htmlFor="sound-upload"
                    className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 cursor-pointer"
                  >
                    Upload
                  </label>
                </div>
              </div>

              {/* Commands */}
              <div>
                <label className="text-white text-sm mb-1 block">Minecraft Commands (separated by ;)</label>
                <input
                  value={(newPreset.commands && newPreset.commands.join(";")) || ""}
                  onChange={(e) => setNewPreset({ ...newPreset, commands: e.target.value.split(";").map((cmd) => cmd.trim()).filter(Boolean) })}
                  placeholder="/bedrock tnt;/bedrock create 5 5"
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded text-white placeholder-blue-200"
                />
              </div>
            </div>
            <button
              onClick={addPreset}
              className="mt-3 px-4 py-2 bg-emerald-500 text-black font-semibold rounded-lg hover:bg-emerald-400 transition"
            >
              Add Preset
            </button>
          </div>

          <div className="space-y-3 max-h-96 overflow-y-auto">
            {presets.map((preset) => (
              <div key={preset.id} className="bg-black/30 border border-white/10 p-4 rounded-lg">
                {editingPreset?.id === preset.id ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        value={editingPreset.giftName}
                        onChange={(e) => setEditingPreset({ ...editingPreset, giftName: e.target.value })}
                        className="px-2 py-1 bg-white/10 border border-white/20 rounded text-white text-sm"
                      />
                      <input
                        type="number"
                        value={editingPreset.coinsPerUnit}
                        onChange={(e) => setEditingPreset({ ...editingPreset, coinsPerUnit: parseInt(e.target.value, 10) || 1 })}
                        className="px-2 py-1 bg-white/10 border border-white/20 rounded text-white text-sm"
                      />
                      <input
                        value={editingPreset.soundFile}
                        onChange={(e) => setEditingPreset({ ...editingPreset, soundFile: e.target.value })}
                        className="px-2 py-1 bg-white/10 border border-white/20 rounded text-white text-sm"
                      />
                      <input
                        value={editingPreset.imageUrl}
                        onChange={(e) => setEditingPreset({ ...editingPreset, imageUrl: e.target.value })}
                        className="px-2 py-1 bg-white/10 border border-white/20 rounded text-white text-sm"
                      />
                      <input
                        value={(editingPreset.commands || []).join(";")}
                        onChange={(e) => setEditingPreset({ ...editingPreset, commands: e.target.value.split(";").map((cmd) => cmd.trim()).filter(Boolean) })}
                        className="px-2 py-1 bg-white/10 border border-white/20 rounded text-white text-sm"
                        placeholder="Commands separated by ;"
                      />
                      <label className="flex items-center gap-2 text-white text-sm">
                        <input
                          type="checkbox"
                          checked={editingPreset.enabled !== false}
                          onChange={(e) => setEditingPreset({ ...editingPreset, enabled: e.target.checked })}
                        />
                        Enabled
                      </label>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => updatePreset(editingPreset)}
                        className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingPreset(null)}
                        className="px-3 py-1 bg-gray-600 text-white rounded text-sm hover:bg-gray-700"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="text-white font-semibold">{preset.giftName}</div>
                    <div className="text-cyan-200/80 text-sm space-y-1">
                      <div>Coins/unit: {preset.coinsPerUnit || 1}</div>
                      {preset.soundFile && <div>Sound: {preset.soundFile}</div>}
                      {preset.imageUrl && <div>Image: {preset.imageUrl}</div>}
                      {Array.isArray(preset.commands) && preset.commands.length > 0 && (
                        <div>Commands: {preset.commands.join(", ")}</div>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                      <button
                        onClick={() => preset.soundFile && testSound(preset.soundFile)}
                        className="px-2 py-1 bg-amber-500/80 text-black rounded text-xs hover:bg-amber-400 disabled:opacity-50"
                        disabled={!preset.soundFile}
                      >
                        ▶️
                      </button>
                      <button
                        onClick={() => handleOpenFunctionEditor(null, preset)}
                        className="px-2 py-1 bg-purple-600 text-white rounded text-xs hover:bg-purple-700"
                        title="Edit Function (Commands & Punishment)"
                      >
                        ⚡
                      </button>
                    <button
                      onClick={() =>
                        setEditingPreset({
                          ...preset,
                          commands: Array.isArray(preset.commands) ? [...preset.commands] : []
                        })
                      }
                      className="px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => deletePreset(preset.id)}
                      className="px-2 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700"
                    >
                      Delete
                    </button>
                  </div>
                  </div>
                )}
              </div>
            ))}
            {presets.length === 0 && (
              <div className="text-center text-cyan-200/70 py-8">No presets configured. Add your first preset above.</div>
            )}
          </div>
        </div>

        <div className="bg-white/5 border border-cyan-500/20 p-6 rounded-2xl shadow-lg shadow-cyan-500/10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-white">Overlay URLs</h2>
            <button
              onClick={generateOverlayUrls}
              className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition"
            >
              Auto Generate
            </button>
          </div>

          <div className="space-y-4">
            {/* Goal Likes Bar */}
            <div className="bg-black/30 border border-white/10 p-4 rounded-lg">
              <h3 className="text-white font-semibold mb-2">Goal Likes Bar</h3>
              <div className="flex gap-2">
                <input
                  value={overlayUrls.goalLikes || ""}
                  onChange={(e) => setOverlayUrls({...overlayUrls, goalLikes: e.target.value})}
                  placeholder="https://app.streamtoearn.io/overlay/.../goal-likes"
                  className="flex-1 px-3 py-2 bg-white/10 border border-white/20 rounded text-white placeholder-blue-200 text-sm"
                />
                <button
                  onClick={() => copyToClipboard(overlayUrls.goalLikes)}
                  className="px-3 py-2 bg-cyan-500/90 text-black rounded hover:bg-cyan-400 transition"
                >
                  Copy
                </button>
              </div>
              {overlayUrls.goalLikes && (
                <div className="mt-3">
                  <img 
                    src={overlayUrls.goalLikes} 
                    alt="Goal Likes Preview"
                    className="w-full h-16 object-cover rounded border border-white/20"
                    onError={(e) => e.target.style.display = 'none'}
                  />
                </div>
              )}
            </div>

            {/* Smart Bar */}
            <div className="bg-black/30 border border-white/10 p-4 rounded-lg">
              <h3 className="text-white font-semibold mb-2">Smart Bar</h3>
              <div className="flex gap-2">
                <input
                  value={overlayUrls.smartBar || ""}
                  onChange={(e) => setOverlayUrls({...overlayUrls, smartBar: e.target.value})}
                  placeholder="https://app.streamtoearn.io/overlay/.../smart-bar"
                  className="flex-1 px-3 py-2 bg-white/10 border border-white/20 rounded text-white placeholder-blue-200 text-sm"
                />
                <button
                  onClick={() => copyToClipboard(overlayUrls.smartBar)}
                  className="px-3 py-2 bg-cyan-500/90 text-black rounded hover:bg-cyan-400 transition"
                >
                  Copy
                </button>
              </div>
              {overlayUrls.smartBar && (
                <div className="mt-3">
                  <img 
                    src={overlayUrls.smartBar} 
                    alt="Smart Bar Preview"
                    className="w-full h-16 object-cover rounded border border-white/20"
                    onError={(e) => e.target.style.display = 'none'}
                  />
                </div>
              )}
            </div>

            {/* Top Gifters */}
            <div className="bg-black/30 border border-white/10 p-4 rounded-lg">
              <h3 className="text-white font-semibold mb-2">Top Gifters</h3>
              <div className="flex gap-2">
                <input
                  value={overlayUrls.topGifters || ""}
                  onChange={(e) => setOverlayUrls({...overlayUrls, topGifters: e.target.value})}
                  placeholder="https://app.streamtoearn.io/overlay/.../top-gifters"
                  className="flex-1 px-3 py-2 bg-white/10 border border-white/20 rounded text-white placeholder-blue-200 text-sm"
                />
                <button
                  onClick={() => copyToClipboard(overlayUrls.topGifters)}
                  className="px-3 py-2 bg-cyan-500/90 text-black rounded hover:bg-cyan-400 transition"
                >
                  Copy
                </button>
              </div>
              {overlayUrls.topGifters && (
                <div className="mt-3">
                  <img 
                    src={overlayUrls.topGifters} 
                    alt="Top Gifters Preview"
                    className="w-full h-24 object-cover rounded border border-white/20"
                    onError={(e) => e.target.style.display = 'none'}
                  />
                </div>
              )}
            </div>

            {/* Gift Presets Overlay */}
            <div className="bg-gray-800/50 p-4 rounded-lg">
              <label className="block text-white font-semibold mb-2">Gift Presets Overlay URL:</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={overlayUrls.giftPresets || ""}
                  onChange={(e) => setOverlayUrls({...overlayUrls, giftPresets: e.target.value})}
                  className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                  placeholder="http://localhost:3001/overlay/gift-presets/username"
                />
                <button
                  onClick={() => copyToClipboard(overlayUrls.giftPresets)}
                  className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                >
                  Copy
                </button>
              </div>
              {overlayUrls.giftPresets && (
                <div className="mt-3">
                  <img 
                    src={overlayUrls.giftPresets} 
                    alt="Gift Presets Preview"
                    className="w-full h-24 object-cover rounded border border-white/20"
                    onError={(e) => e.target.style.display = 'none'}
                  />
                </div>
              )}
            </div>
          </div>

          <button
            onClick={updateOverlay}
            className="mt-4 w-full px-4 py-2 bg-emerald-500 text-black font-semibold rounded-lg hover:bg-emerald-400 transition"
          >
            Save Overlay URLs
          </button>
          
          <div className="mt-4 p-4 bg-cyan-500/10 border border-cyan-500/20 rounded-lg">
            <h4 className="text-cyan-200 font-semibold mb-2">✨ Dynamic Overlay Features</h4>
            <ul className="text-cyan-200/80 text-sm space-y-1">
              <li>• <strong>Real-time Updates:</strong> Overlays auto-refresh with live data</li>
              <li>• <strong>Gift Images:</strong> Shows actual TikTok gift icons from your presets</li>
              <li>• <strong>Progress Bars:</strong> Visual progress toward your goals</li>
              <li>• <strong>Live Stats:</strong> Coins, viewers, timer updated in real-time</li>
              <li>• <strong>Top Gifters:</strong> Ranking based on your configured gifts</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="bg-white/5 border border-cyan-500/20 rounded-2xl p-6 shadow-lg shadow-cyan-500/10">
        <h2 className="text-xl font-bold text-white mb-4">TikTok Draw Bot Integration</h2>
        <div className="text-cyan-200 space-y-2">
          <p><strong>System:</strong> TikTok Draw Bot với Minecraft Plugin Integration</p>
          <p><strong>Flow:</strong> TikTok Live → Gift Detection → Minecraft Commands → Robot Drawing</p>
          <p><strong>API Endpoint:</strong> <code className="bg-black/30 px-2 py-1 rounded">{API_URL}/api/plugin/config/{username}</code></p>
          <p><strong>Socket.IO:</strong> Connect to <code className="bg-black/30 px-2 py-1 rounded">{API_URL}</code> và join room <code className="bg-black/30 px-2 py-1 rounded">plugin:{username}</code></p>
          <p><strong>Events:</strong> Nghe event <code className="bg-black/30 px-2 py-1 rounded">plugin:trigger</code> cho Minecraft commands</p>
        </div>
      </div>

      {/* Gift Selector Modal */}
      {showGiftSelector && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-900 border border-cyan-500/20 rounded-2xl p-6 max-w-4xl w-full mx-4 max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-white">Select TikTok Gift</h3>
              <button
                onClick={() => setShowGiftSelector(false)}
                className="text-white hover:text-red-400 text-2xl"
              >
                ×
              </button>
            </div>
            
            <div className="grid grid-cols-5 gap-3 max-h-96 overflow-y-auto">
              {availableGifts.map((gift) => (
                <button
                  key={gift.name}
                  onClick={() => handleGiftSelect(gift)}
                  className={`p-3 rounded-lg border-2 transition-all ${
                    selectedGift?.name === gift.name
                      ? 'border-green-500 bg-green-500/20'
                      : 'border-white/20 bg-white/5 hover:border-cyan-500/50'
                  }`}
                >
                  <div className="text-center">
                    <div className="mb-2 flex justify-center">
                      <img 
                        src={gift.imageUrl} 
                        alt={gift.name}
                        className="w-12 h-12 object-contain"
                      />
                    </div>
                    <div className="text-white text-sm font-semibold">{gift.name}</div>
                    <div className="text-yellow-400 text-xs">💰 {gift.price}</div>
                  </div>
                </button>
              ))}
            </div>
            
            <div className="flex justify-end mt-4">
              <button
                onClick={() => setShowGiftSelector(false)}
                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sound Selector Modal */}
      {showSoundSelector && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-900 border border-cyan-500/20 rounded-2xl p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-white">Select Sound</h3>
              <button
                onClick={() => setShowSoundSelector(false)}
                className="text-white hover:text-red-400 text-2xl"
              >
                ×
              </button>
            </div>
            
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {availableSounds.map((sound) => (
                <button
                  key={sound.file}
                  onClick={() => handleSoundSelect(sound)}
                  className={`w-full p-3 rounded-lg border-2 transition-all text-left ${
                    selectedSound?.file === sound.file
                      ? 'border-green-500 bg-green-500/20'
                      : 'border-white/20 bg-white/5 hover:border-cyan-500/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-white font-semibold">{sound.name}</div>
                      <div className="text-gray-400 text-sm">{sound.description}</div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          testSound(sound.file);
                        }}
                        className="px-2 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                      >
                        ▶️
                      </button>
                    </div>
                  </div>
                </button>
              ))}
            </div>
            
            <div className="flex justify-end mt-4">
              <button
                onClick={() => setShowSoundSelector(false)}
                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Function Editor Modal */}
      <FunctionEditor
        isOpen={showFunctionEditor}
        onClose={() => {
          setShowFunctionEditor(false);
          setCurrentFunction(null);
        }}
        onSave={handleSaveFunction}
        functionData={currentFunction}
        availableSounds={availableSounds}
        onSoundUpload={handleSoundUpload}
      />

      {/* Sound Selector Modal */}
      <SoundSelector
        isOpen={showSoundSelector}
        onClose={() => setShowSoundSelector(false)}
        onSelect={(sound, volume) => {
          setSelectedSound(sound);
          toast.success(`Sound selected: ${sound.name}`);
        }}
        availableSounds={availableSounds}
        onUpload={handleSoundUpload}
      />
      </AppShell>
    </ErrorBoundary>
  );
}