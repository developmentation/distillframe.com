// router/index.js
import Landing from '../components/Landing.js';
const routes = [
  {
    path: '/',
    component: Landing,
    name: 'landing',
  },
  {
    path: '/:channelName',
    component: Landing,
    name: 'landingWithChannel',
    props: true,
  },
];

const router = VueRouter.createRouter({
  history: VueRouter.createWebHistory(),
  routes,
});

export default router;