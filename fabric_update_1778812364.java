```java
package com.hollowtech.groupstream;

import android.content.Context;
import android.os.Bundle;
import androidx.fragment.app.Fragment;
import androidx.fragment.app.FragmentManager;
import androidx.fragment.app.FragmentPagerAdapter;
import androidx.viewpager.widget.ViewPager;
import android.util.Log;
import android.view.LayoutInflater;
import android.view.MenuInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.ImageView;

import com.google.android.material.tabs.TabLayout;
import com.hollowtech.groupstream.fragments.DMFragment;
import com.hollowtech.groupstream.fragments.HollowHiveFragment;

import java.util.ArrayList;
import java.util.List;

public class GroupStreamActivity extends AppCompatActivity {

    private static final String TAG = "GroupStream";
    public static final int NUM_TABS = 2;

    private TabLayout tabLayout;
    private ViewPager viewPager;
    private ViewPagerAdapter adapter;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_group_stream);

        // Set up the toolbar
        Toolbar toolbar = findViewById(R.id.toolbar);
        setSupportActionBar(toolbar);

        // Get a reference to the TabLayout
        tabLayout = findViewById(R.id.tab_layout);
        tabLayout.setupWithViewPager(viewPager);

        // Create an array of tabs
        String[] tabTitles = new String[NUM_TABS];
        tabTitles[0] = "Hollow Hive";
        tabTitles[1] = "P2P Direct Messages";

        // Set up the ViewPager with a FragmentPagerAdapter
        viewPager = findViewById(R.id.view_pager);
        adapter = new ViewPagerAdapter(getSupportFragmentManager(), NUM_TAB[7D[K
NUM_TABS, tabTitles);
        viewPager.setAdapter(adapter);

        // Add a listener to the TabLayout
        tabLayout.addOnTabSelectedListener(new TabLayout.OnTabSelectedListe[28D[K
TabLayout.OnTabSelectedListener() {
            @Override
            public void onTabSelected(TabLayout.Tab tab) {
                int position = tab.getPosition();
                Log.d(TAG, "Tab selected: " + position);
                switch (position) {
                    case 0:
                        // Hollow Hive logic here
                        break;
                    case 1:
                        // P2P Direct Messages logic here
                        break;
                }
            }

            @Override
            public void onTabUnselected(TabLayout.Tab tab) {
                int position = tab.getPosition();
                Log.d(TAG, "Tab unselected: " + position);
            }

            @Override
            public void onTabReselected(TabLayout.Tab tab) {

            }
        });
    }

    private class ViewPagerAdapter extends FragmentPagerAdapter {
        private String[] tabTitles;
        private int numTabs;

        public ViewPagerAdapter(FragmentManager fm, int numTabs, String[] t[1D[K
tabTitles) {
            super(fm);
            this.numTabs = numTabs;
            this.tabTitles = tabTitles;
        }

        @Override
        public Fragment getItem(int position) {
            switch (position) {
                case 0:
                    return new HollowHiveFragment();
                case 1:
                    return new DMFragment();
                default:
                    return null;
            }
        }

        @Override
        public int getCount() {
            return numTabs;
        }

        @Override
        public CharSequence getPageTitle(int position) {
            return tabTitles[position];
        }
    }
}
```

